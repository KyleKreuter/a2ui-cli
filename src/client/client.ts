import { randomUUID } from 'node:crypto';
import { createConnection, type Socket } from 'node:net';
import { toJsonLine } from '../protocol/jsonl.js';
import { createLineSplitter } from '../protocol/lines.js';
import {
  parseServerLine,
  type ActionMessage,
  type ClientMessage,
  type CloseReason,
  type ServerMessage,
} from '../protocol/messages.js';

/** How long `connect` waits for the `ready` message. */
const READY_TIMEOUT_MS = 2000;

/** No renderer listens on the socket. */
export class NoRendererError extends Error {
  constructor(readonly socket: string) {
    super(`no renderer listens on ${socket}`);
    this.name = 'NoRendererError';
  }
}

/** The renderer stopped, or the connection to it ended. */
export class RendererClosedError extends Error {
  /** The reason from the `closed` message, or `lost` when none arrived. */
  constructor(readonly reason: CloseReason | 'lost') {
    super(
      reason === 'lost'
        ? 'the connection to the renderer was lost'
        : `the renderer stopped (reason: ${reason})`,
    );
    this.name = 'RendererClosedError';
  }
}

/** `waitForAction` got no action in time. */
export class ActionTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`no action within ${timeoutMs / 1000} s`);
    this.name = 'ActionTimeoutError';
  }
}

interface Waiter<T> {
  resolve(value: T): void;
  reject(error: Error): void;
}

export type ReadyMessage = Extract<ServerMessage, { type: 'ready' }>;

/**
 * A client of the socket protocol.
 *
 * The server handles the lines of one connection in order and answers errors
 * to the sender only, so {@link confirm} can attribute errors to the messages
 * sent before it.
 */
export class PaneClient {
  private errors: string[] = [];
  private readonly pings = new Map<string, Waiter<string[]>>();
  private readonly actions: ActionMessage[] = [];
  private readonly actionWaiters: Waiter<ActionMessage>[] = [];
  private readonly closeWaiters: (() => void)[] = [];
  private listening = false;
  private closeReason: CloseReason | undefined;
  private closedError: RendererClosedError | undefined;

  private constructor(
    private readonly socket: Socket,
    readonly ready: ReadyMessage,
  ) {}

  /**
   * Connects to the renderer on `socket` and waits for its `ready` message.
   * Rejects with {@link NoRendererError} when nothing listens there.
   */
  static connect(socket: string): Promise<PaneClient> {
    return new Promise((resolve, reject) => {
      const connection = createConnection(socket);
      let client: PaneClient | undefined;
      const fail = (error: Error) => {
        clearTimeout(timer);
        connection.destroy();
        reject(error);
      };
      const timer = setTimeout(() => {
        fail(new Error(`${socket} sent no ready message within ${READY_TIMEOUT_MS} ms`));
      }, READY_TIMEOUT_MS);

      const splitter = createLineSplitter((line) => {
        const parsed = parseServerLine(line);
        if (!parsed.ok) {
          return;
        }
        if (client) {
          client.handle(parsed.message);
        } else if (parsed.message.type === 'ready') {
          clearTimeout(timer);
          client = new PaneClient(connection, parsed.message);
          resolve(client);
        }
      });
      connection.on('data', (chunk) => {
        try {
          splitter.push(chunk);
        } catch (error) {
          connection.destroy(error instanceof Error ? error : undefined);
        }
      });
      connection.on('error', (error: NodeJS.ErrnoException) => {
        if (client) {
          return;
        }
        if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
          fail(new NoRendererError(socket));
        } else {
          fail(error);
        }
      });
      connection.on('close', () => {
        if (client) {
          client.handleClose();
        } else {
          fail(new RendererClosedError('lost'));
        }
      });
    });
  }

  /** Sends one message. Use {@link confirm} to learn whether it was accepted. */
  send(message: ClientMessage): void {
    if (!this.closedError) {
      this.socket.write(toJsonLine(message));
    }
  }

  /**
   * Sends a `ping` and resolves with the error messages that arrived since the
   * last confirm, once the `pong` arrives. From then on, the client collects
   * actions for {@link waitForAction}.
   */
  confirm(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (this.closedError) {
        reject(this.closedError);
        return;
      }
      const id = randomUUID();
      this.pings.set(id, { resolve, reject });
      this.send({ type: 'ping', id });
    });
  }

  /**
   * Resolves with the next action after the first confirmed `pong`. Rejects
   * with {@link RendererClosedError} when the renderer stops first, and with
   * {@link ActionTimeoutError} after `timeoutMs`.
   */
  waitForAction(timeoutMs?: number): Promise<ActionMessage> {
    const queued = this.actions.shift();
    if (queued) {
      return Promise.resolve(queued);
    }
    if (this.closedError) {
      return Promise.reject(this.closedError);
    }
    return new Promise((resolve, reject) => {
      const timer =
        timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              this.actionWaiters.splice(this.actionWaiters.indexOf(waiter), 1);
              reject(new ActionTimeoutError(timeoutMs));
            }, timeoutMs);
      const waiter: Waiter<ActionMessage> = {
        resolve: (action) => {
          clearTimeout(timer);
          resolve(action);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      this.actionWaiters.push(waiter);
    });
  }

  /** Resolves when the connection has closed. */
  closed(): Promise<void> {
    if (this.closedError) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.closeWaiters.push(resolve));
  }

  /** Ends the connection. */
  end(): void {
    this.socket.end();
  }

  private handle(message: ServerMessage): void {
    switch (message.type) {
      case 'error':
        this.errors.push(message.message);
        return;
      case 'pong': {
        const waiter = this.pings.get(message.id);
        if (waiter) {
          this.pings.delete(message.id);
          const errors = this.errors;
          this.errors = [];
          this.listening = true;
          waiter.resolve(errors);
        }
        return;
      }
      case 'action': {
        if (!this.listening) {
          return;
        }
        const waiter = this.actionWaiters.shift();
        if (waiter) {
          waiter.resolve(message);
        } else {
          this.actions.push(message);
        }
        return;
      }
      case 'closed':
        this.closeReason = message.reason;
        return;
      case 'ready':
        return;
    }
  }

  private handleClose(): void {
    const error = new RendererClosedError(this.closeReason ?? 'lost');
    this.closedError = error;
    for (const waiter of this.pings.values()) {
      waiter.reject(error);
    }
    this.pings.clear();
    for (const waiter of this.actionWaiters.splice(0)) {
      waiter.reject(error);
    }
    for (const resolve of this.closeWaiters.splice(0)) {
      resolve();
    }
  }
}
