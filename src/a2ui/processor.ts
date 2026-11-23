import { parseMessages } from '../protocol/jsonl.js';
import {
  MessageProcessor,
  basicCatalog,
  type ActionPayload,
  type CallAgentFunctionMessage,
  type RendererErrorMessage,
  type RendererFunctionResponseMessage,
  type SurfaceModel,
} from './webcore.js';

/** The A2UI protocol version that a2ui-term accepts. */
export const PROTOCOL_VERSION = '1.0';

/** The id of the catalog that a2ui-term renders. */
export const CATALOG_ID = basicCatalog.id;

/** A user action with all data bindings in its context resolved. */
export interface ActionEvent {
  readonly name: string;
  readonly surfaceId: string;
  readonly sourceComponentId: string;
  readonly timestamp: string;
  readonly context: Record<string, unknown>;
  /** Human-readable description of the action, if the action defines `userMessage`. */
  readonly userMessage?: string;
  /** Snapshot of the surface's data model, present if the surface has `sendDataModel`. */
  readonly dataModel?: Record<string, unknown>;
}

/** A message that the runtime could not parse or apply. */
export interface RuntimeError {
  readonly code: string;
  readonly message: string;
  readonly surfaceId?: string;
  /** Input line, for JSON Lines input. */
  readonly line?: number;
}

export type ActionHandler = (event: ActionEvent) => void;

/** A message from the renderer to the agent, other than an action event. */
export type OutboundMessage = RendererFunctionResponseMessage | CallAgentFunctionMessage;

export type OutboundHandler = (message: OutboundMessage) => void;

type Unsubscribe = () => void;

/**
 * Applies A2UI 1.0 messages to surface state and reports user actions and
 * outbound messages for the agent.
 *
 * Each message is applied on its own, so an invalid message never blocks the
 * messages after it.
 */
export class A2uiRuntime {
  readonly processor: MessageProcessor;
  private readonly actionHandlers = new Set<ActionHandler>();
  private readonly outboundHandlers = new Set<OutboundHandler>();

  constructor() {
    this.processor = new MessageProcessor(
      [basicCatalog],
      (payload) => {
        const event = this.toActionEvent(payload);
        for (const handler of this.actionHandlers) {
          handler(event);
        }
      },
      {
        outboundListener: (message) => {
          for (const handler of this.outboundHandlers) {
            handler(message);
          }
        },
      },
    );
  }

  /** Calls `handler` for every action the user triggers on any surface. */
  onAction(handler: ActionHandler): Unsubscribe {
    this.actionHandlers.add(handler);
    return () => {
      this.actionHandlers.delete(handler);
    };
  }

  /** Calls `handler` for every renderer function response and agent function call. */
  onOutbound(handler: OutboundHandler): Unsubscribe {
    this.outboundHandlers.add(handler);
    return () => {
      this.outboundHandlers.delete(handler);
    };
  }

  /** Parses JSON Lines or a JSON array and applies every valid message. */
  applyText(input: string): RuntimeError[] {
    const { messages, errors } = parseMessages(input);
    const parseErrors: RuntimeError[] = errors.map((error) => ({
      code: 'PARSE_ERROR',
      message: `Line ${error.line}: ${error.message}`,
      line: error.line,
    }));
    return [...parseErrors, ...this.apply(messages)];
  }

  /** Applies messages in order and returns the errors of the ones that failed. */
  apply(messages: readonly unknown[]): RuntimeError[] {
    return messages.flatMap((message) => this.applyOne(message));
  }

  /** Deletes every surface. */
  clear(): RuntimeError[] {
    return this.apply(
      [...this.surfaces().keys()].map((surfaceId) => ({
        version: PROTOCOL_VERSION,
        deleteSurface: { surfaceId },
      })),
    );
  }

  surfaces(): ReadonlyMap<string, SurfaceModel> {
    return this.processor.getSurfaces();
  }

  onSurfaceCreated(handler: (surface: SurfaceModel) => void): Unsubscribe {
    const subscription = this.processor.onSurfaceCreated(handler);
    return () => {
      subscription.unsubscribe();
    };
  }

  onSurfaceDeleted(handler: (surfaceId: string) => void): Unsubscribe {
    const subscription = this.processor.onSurfaceDeleted(handler);
    return () => {
      subscription.unsubscribe();
    };
  }

  dispose(): void {
    this.actionHandlers.clear();
    this.outboundHandlers.clear();
    this.processor.dispose();
  }

  private applyOne(message: unknown): RuntimeError[] {
    const versionError = checkVersion(message);
    if (versionError) {
      return [versionError];
    }
    return this.processor.processMessagesWithErrors(message).map(toRuntimeError);
  }

  private toActionEvent(payload: ActionPayload): ActionEvent {
    const event: ActionEvent = {
      name: payload.name,
      surfaceId: payload.surfaceId,
      sourceComponentId: payload.sourceComponentId,
      timestamp: payload.timestamp,
      context: payload.context,
      ...(payload.userMessage === undefined ? {} : { userMessage: payload.userMessage }),
    };
    const surface = this.processor.getSurface(payload.surfaceId);
    if (!surface?.sendDataModel) {
      return event;
    }
    const dataModel = structuredClone(surface.dataModel.get<Record<string, unknown>>('/'));
    return { ...event, dataModel };
  }
}

function checkVersion(message: unknown): RuntimeError | undefined {
  const version =
    typeof message === 'object' && message !== null && 'version' in message
      ? message.version
      : undefined;
  if (version === PROTOCOL_VERSION) {
    return undefined;
  }
  const found = typeof version === 'string' ? `"${version}"` : 'no version';
  return {
    code: 'UNSUPPORTED_VERSION',
    message: `Message has ${found}. a2ui-term supports A2UI ${PROTOCOL_VERSION} only.`,
    ...surfaceIdOf(message),
  };
}

function surfaceIdOf(message: unknown): { surfaceId?: string } {
  if (typeof message !== 'object' || message === null) {
    return {};
  }
  for (const body of Object.values(message as Record<string, unknown>)) {
    const surfaceId =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>).surfaceId
        : undefined;
    if (typeof surfaceId === 'string') {
      return { surfaceId };
    }
  }
  return {};
}

function toRuntimeError(error: RendererErrorMessage): RuntimeError {
  const { code, message, surfaceId } = error.error;
  return surfaceId ? { code, message, surfaceId } : { code, message };
}
