import { createServer, type Server, type Socket } from 'node:net';
import type { ActionEvent } from '../a2ui/processor.js';
import type { Logger } from '../log.js';
import { toJsonLine } from '../protocol/jsonl.js';
import { LineTooLongError, createLineSplitter } from '../protocol/lines.js';
import {
  A2UI_SPEC,
  parseClientLine,
  type ClientMessage,
  type CloseReason,
  type ServerMessage,
} from '../protocol/messages.js';

/** Largest amount of unsent output per client before the server drops it. */
export const MAX_WRITE_BUFFER_BYTES = 4 * 1024 * 1024;

/** How long clients get to close their side after `closed`. */
const CLOSE_GRACE_MS = 200;

/** What the server needs from the renderer. `A2uiRuntime` implements it. */
export interface Renderer {
  apply(messages: readonly unknown[]): readonly { readonly message: string }[];
  clear(): unknown;
  onAction(handler: (event: ActionEvent) => void): () => void;
}

export interface PaneServerOptions {
  /** Path of the Unix domain socket to listen on. */
  readonly socket: string;
  readonly renderer: Renderer;
  /** Tool version for the `ready` message. */
  readonly version: string;
  readonly logger?: Logger;
  /** Called when the number of connected clients changes. */
  readonly onClientCount?: (count: number) => void;
  /** Called for a `focus` message. */
  readonly onFocus?: () => void;
  /**
   * Called for a `close` message. Without a handler the server stops itself
   * with reason `client`.
   */
  readonly onCloseRequest?: () => void;
}

/**
 * The renderer side of the socket protocol: accepts clients on a Unix domain
 * socket, applies their messages to the renderer in order, answers errors to
 * the sender and sends user actions to every client.
 */
export class PaneServer {
  private readonly clients = new Set<Socket>();
  private readonly offAction: () => void;
  private stopping: Promise<void> | undefined;

  private constructor(
    private readonly server: Server,
    private readonly options: PaneServerOptions,
  ) {
    this.offAction = options.renderer.onAction((event) => {
      this.broadcast({ type: 'action', ...event });
    });
    server.on('connection', (client) => {
      this.accept(client);
    });
  }

  /** Starts a server on `options.socket`. Rejects when the socket cannot be bound. */
  static listen(options: PaneServerOptions): Promise<PaneServer> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.once('error', reject);
      server.listen(options.socket, () => {
        server.off('error', reject);
        resolve(new PaneServer(server, options));
      });
    });
  }

  get clientCount(): number {
    return this.clients.size;
  }

  /**
   * Sends `closed` to every client, ends all connections and stops listening.
   * Node removes the socket file. Later calls return the first call's promise.
   */
  stop(reason: CloseReason): Promise<void> {
    this.stopping ??= new Promise((resolve) => {
      this.offAction();
      this.broadcast({ type: 'closed', reason });
      for (const client of this.clients) {
        client.end();
        setTimeout(() => client.destroy(), CLOSE_GRACE_MS).unref();
      }
      this.server.close(() => {
        resolve();
      });
    });
    return this.stopping;
  }

  private accept(client: Socket): void {
    if (this.stopping) {
      client.destroy();
      return;
    }
    this.clients.add(client);
    this.options.onClientCount?.(this.clients.size);
    this.log('client connected', { clients: this.clients.size });

    const splitter = createLineSplitter((line) => {
      this.handleLine(client, line);
    });
    client.on('data', (chunk) => {
      try {
        splitter.push(chunk);
      } catch (error) {
        if (!(error instanceof LineTooLongError)) {
          throw error;
        }
        this.send(client, { type: 'error', source: 'protocol', message: error.message });
        client.end();
      }
    });
    client.on('error', (error) => {
      this.log('client error', { message: error.message });
    });
    client.on('close', () => {
      this.clients.delete(client);
      if (!this.stopping) {
        this.options.onClientCount?.(this.clients.size);
      }
      this.log('client disconnected', { clients: this.clients.size });
    });

    this.send(client, { type: 'ready', version: this.options.version, a2uiSpec: A2UI_SPEC });
  }

  private handleLine(client: Socket, line: string): void {
    if (line.trim() === '' || this.stopping) {
      return;
    }
    const parsed = parseClientLine(line);
    if (!parsed.ok) {
      this.send(client, { type: 'error', source: parsed.source, message: parsed.error });
      return;
    }
    this.dispatch(client, parsed.message);
  }

  private dispatch(client: Socket, message: ClientMessage): void {
    switch (message.type) {
      case 'a2ui':
        for (const error of this.options.renderer.apply([message.message])) {
          this.send(client, { type: 'error', source: 'render', message: error.message });
        }
        return;
      case 'clear':
        this.options.renderer.clear();
        return;
      case 'focus':
        this.options.onFocus?.();
        return;
      case 'close':
        if (this.options.onCloseRequest) {
          this.options.onCloseRequest();
        } else {
          void this.stop('client');
        }
        return;
      case 'ping':
        this.send(client, { type: 'pong', id: message.id });
        return;
    }
  }

  private broadcast(message: ServerMessage): void {
    for (const client of this.clients) {
      this.send(client, message);
    }
  }

  private send(client: Socket, message: ServerMessage): void {
    if (client.destroyed || !client.writable) {
      return;
    }
    client.write(toJsonLine(message));
    if (client.writableLength > MAX_WRITE_BUFFER_BYTES) {
      this.log('client dropped', { reason: 'write buffer full' });
      client.destroy();
    }
  }

  private log(event: string, data: Record<string, unknown>): void {
    this.options.logger?.write(event, data);
  }
}
