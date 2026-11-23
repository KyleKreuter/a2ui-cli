import { z } from 'zod';
import { PROTOCOL_VERSION } from '../a2ui/processor.js';

/*
 * Messages of the socket protocol between a2ui-term clients and the renderer.
 * See docs/protocol.md. Objects may carry extra fields; parsing drops them.
 */

const a2uiMessage = z.object({
  type: z.literal('a2ui'),
  // The runtime validates the A2UI message itself.
  message: z.unknown().refine((value): boolean => value !== undefined, 'Expected an A2UI message'),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  a2uiMessage,
  z.object({ type: z.literal('clear') }),
  z.object({ type: z.literal('focus') }),
  z.object({ type: z.literal('close') }),
  z.object({ type: z.literal('ping'), id: z.string() }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const errorSources = ['protocol', 'parse', 'render'] as const;
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

export const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready'), version: z.string(), a2uiSpec: z.string() }),
  z.object({ type: z.literal('pong'), id: z.string() }),
  actionMessageSchema,
  z.object({ type: z.literal('error'), message: z.string(), source: z.enum(errorSources) }),
  z.object({ type: z.literal('closed'), reason: z.enum(closeReasons) }),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** The `a2uiSpec` value of the `ready` message. */
export const A2UI_SPEC = PROTOCOL_VERSION;

export type LineResult<T> =
  | { readonly ok: true; readonly message: T }
  | { readonly ok: false; readonly source: 'parse' | 'protocol'; readonly error: string };

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
  return { ok: false, source: 'protocol', error: describeIssue(value, result.error) };
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
