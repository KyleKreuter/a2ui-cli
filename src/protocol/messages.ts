import { z } from 'zod';
import { PROTOCOL_VERSION } from '../a2ui/processor.js';
import { GRID_COLUMNS } from '../board/registry.js';

/*
 * Messages of the socket protocol between a2ui-term clients and the renderer.
 * See docs/protocol.md. Objects may carry extra fields; parsing drops them.
 */

const a2uiMessage = z.object({
  type: z.literal('a2ui'),
  // The runtime validates the A2UI message itself.
  message: z.unknown().refine((value): boolean => value !== undefined, 'Expected an A2UI message'),
});

/** Request id of a widget message. The reply or error carries the same id. */
const requestId = z.string().min(1);

const widgetId = z.string().min(1);

const addMessage = z.object({
  type: z.literal('add'),
  id: requestId,
  messages: z.array(z.unknown()),
  width: z.number().int().min(1).max(GRID_COLUMNS).optional(),
  title: z.string().optional(),
  owner: z.string().optional(),
  label: z.string().optional(),
});

const removeMessage = z
  .object({
    type: z.literal('remove'),
    id: requestId,
    widgetIds: z.array(widgetId).min(1).optional(),
    owner: z.string().min(1).optional(),
  })
  .refine(
    (message) => (message.widgetIds === undefined) !== (message.owner === undefined),
    'Expected either "widgetIds" or "owner"',
  );

export const clientMessageSchema = z.discriminatedUnion('type', [
  a2uiMessage,
  z.object({ type: z.literal('clear') }),
  z.object({ type: z.literal('focus') }),
  z.object({ type: z.literal('close') }),
  z.object({ type: z.literal('ping'), id: z.string() }),
  addMessage,
  z.object({
    type: z.literal('update'),
    id: requestId,
    widgetId,
    messages: z.array(z.unknown()),
  }),
  removeMessage,
  z.object({ type: z.literal('list'), id: requestId }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const errorSources = ['protocol', 'parse', 'render', 'widget'] as const;
export type ErrorSource = (typeof errorSources)[number];

export const closeReasons = ['user', 'client', 'error'] as const;
export type CloseReason = (typeof closeReasons)[number];

const record = z.record(z.string(), z.unknown());

export const actionMessageSchema = z.object({
  type: z.literal('action'),
  surfaceId: z.string(),
  name: z.string(),
  sourceComponentId: z.string(),
  timestamp: z.string(),
  context: record,
  userMessage: z.string().optional(),
  dataModel: record.optional(),
});

export type ActionMessage = z.infer<typeof actionMessageSchema>;

const nullableString = z.string().nullable();

export const widgetInfoSchema = z.object({
  widgetId,
  title: nullableString,
  label: nullableString,
  owner: nullableString,
  width: z.number().int(),
  position: z.number().int(),
});

export const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready'), version: z.string(), a2uiSpec: z.string() }),
  z.object({ type: z.literal('pong'), id: z.string() }),
  actionMessageSchema,
  z.object({
    type: z.literal('error'),
    message: z.string(),
    source: z.enum(errorSources),
    /** The request id of the widget message that failed. */
    id: z.string().optional(),
  }),
  z.object({ type: z.literal('closed'), reason: z.enum(closeReasons) }),
  z.object({ type: z.literal('added'), id: requestId, widgetId }),
  z.object({ type: z.literal('updated'), id: requestId }),
  z.object({ type: z.literal('removed'), id: requestId, widgetIds: z.array(widgetId) }),
  z.object({ type: z.literal('widgets'), id: requestId, widgets: z.array(widgetInfoSchema) }),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** The `a2uiSpec` value of the `ready` message. */
export const A2UI_SPEC = PROTOCOL_VERSION;

/** A client message that expects a reply with its request id. */
export type WidgetRequest = Extract<ClientMessage, { type: 'add' | 'update' | 'remove' | 'list' }>;

/** The reply to each widget request. */
export interface WidgetReplies {
  readonly add: Extract<ServerMessage, { type: 'added' }>;
  readonly update: Extract<ServerMessage, { type: 'updated' }>;
  readonly remove: Extract<ServerMessage, { type: 'removed' }>;
  readonly list: Extract<ServerMessage, { type: 'widgets' }>;
}

export type WidgetReply = WidgetReplies[keyof WidgetReplies];

export type LineResult<T> =
  | { readonly ok: true; readonly message: T }
  | {
      readonly ok: false;
      readonly source: 'parse' | 'protocol';
      readonly error: string;
      /** The string `id` of the invalid object, so that the error can name the request. */
      readonly id?: string;
    };

/** Parses and validates one line from a client. */
export function parseClientLine(line: string): LineResult<ClientMessage> {
  return parseLine(line, clientMessageSchema);
}

/** Parses and validates one line from the server. */
export function parseServerLine(line: string): LineResult<ServerMessage> {
  return parseLine(line, serverMessageSchema);
}

function parseLine<T>(line: string, schema: z.ZodType<T>): LineResult<T> {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch (error) {
    return {
      ok: false,
      source: 'parse',
      error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const result = schema.safeParse(value);
  if (result.success) {
    return { ok: true, message: result.data };
  }
  const id =
    typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string'
      ? value.id
      : undefined;
  return {
    ok: false,
    source: 'protocol',
    error: describeIssue(value, result.error),
    ...(id === undefined ? {} : { id }),
  };
}

function describeIssue(value: unknown, error: z.ZodError): string {
  const type =
    typeof value === 'object' && value !== null && 'type' in value ? value.type : undefined;
  const issue = error.issues[0];
  if (typeof type !== 'string') {
    return 'Expected an object with a string field "type"';
  }
  if (issue?.code === 'invalid_union' && issue.path.length === 1 && issue.path[0] === 'type') {
    return `Unknown message type "${type}"`;
  }
  const path = issue?.path.join('.') ?? '';
  return `Invalid "${type}" message: ${path ? `${path}: ` : ''}${issue?.message ?? 'invalid'}`;
}
