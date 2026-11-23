import { A2uiRuntime, PROTOCOL_VERSION } from '../a2ui/processor.js';
import type { SurfaceModel } from '../a2ui/webcore.js';

/*
 * Rewrites the A2UI messages of one `add` or `update` request to a widget id,
 * and checks them on a scratch runtime first, so that the board applies them
 * all or none.
 */

/** The message kinds that `update` accepts, and `add` after its `createSurface`. */
const UPDATE_KINDS = ['updateComponents', 'updateDataModel'] as const;

/** Every A2UI 1.0 message kind that a client can send to the renderer. */
const MESSAGE_KINDS = [
  'createSurface',
  'updateComponents',
  'updateDataModel',
  'deleteSurface',
  'agentFunctionResponse',
  'callRendererFunction',
] as const;

type Message = Record<string, unknown>;

export type Checked =
  | { readonly ok: true; readonly messages: readonly Message[] }
  | { readonly ok: false; readonly error: string };

/**
 * Checks the input of `add`: exactly one `createSurface`, then only
 * `updateComponents` and `updateDataModel` for the same surface. Returns the
 * messages with every `surfaceId` replaced by `widgetId`.
 */
export function rewriteAdd(messages: readonly unknown[], widgetId: string): Checked {
  const kinds = messages.map(kindOf);
  const creates = kinds.filter((kind) => kind === 'createSurface').length;
  if (creates !== 1) {
    return {
      ok: false,
      error: `add needs exactly one createSurface message, the input has ${creates}`,
    };
  }
  const other = kinds.find(
    (kind) => kind !== 'createSurface' && !UPDATE_KINDS.includes(kind as never),
  );
  if (other !== undefined) {
    return {
      ok: false,
      error: `add accepts createSurface, ${UPDATE_KINDS.join(' and ')} only, not ${other}`,
    };
  }
  const surfaceIds = new Set(
    messages.map((message) => bodyOf(message)?.surfaceId).filter((id) => id !== undefined),
  );
  if (surfaceIds.size > 1) {
    return {
      ok: false,
      error: 'add needs messages for one surface, the input names several surface ids',
    };
  }
  return { ok: true, messages: messages.map((message) => withSurfaceId(message, widgetId)) };
}

/**
 * Checks the input of `update`: only `updateComponents` and `updateDataModel`.
 * Returns the messages with every `surfaceId` replaced by `widgetId`.
 */
export function rewriteUpdate(messages: readonly unknown[], widgetId: string): Checked {
  const other = messages.map(kindOf).find((kind) => !UPDATE_KINDS.includes(kind as never));
  if (other !== undefined) {
    return { ok: false, error: `update accepts ${UPDATE_KINDS.join(' and ')} only, not ${other}` };
  }
  return { ok: true, messages: messages.map((message) => withSurfaceId(message, widgetId)) };
}

/**
 * Applies `messages` to a scratch runtime that holds a copy of `surface`, or
 * no surface, and returns the error messages. The real runtime stays as it is.
 */
export function tryMessages(
  messages: readonly Message[],
  surface?: SurfaceModel,
): readonly string[] {
  const scratch = new A2uiRuntime();
  try {
    const copied = surface ? scratch.apply([snapshotOf(surface)]) : [];
    if (copied.length > 0) {
      // Never apply messages that were not checked.
      return copied.map((error) => `cannot check the messages: ${error.message}`);
    }
    // A copy, because the runtime keeps and changes the objects it gets.
    return scratch.apply(structuredClone(messages)).map((error) => error.message);
  } finally {
    scratch.dispose();
  }
}

/**
 * A `createSurface` message that recreates `surface` with its components and
 * data. The message holds copies, so applying it never changes `surface`.
 */
export function snapshotOf(surface: SurfaceModel): Message {
  const components = [...surface.componentsModel.values].map((component) => ({
    ...component.properties,
    id: component.id,
    component: component.type,
    ...(component.metadata === undefined ? {} : { metadata: component.metadata }),
  }));
  const dataModel: unknown = surface.dataModel.get('/');
  return structuredClone({
    version: PROTOCOL_VERSION,
    createSurface: {
      surfaceId: surface.id,
      ...(surface.defaultCatalog ? { catalogId: surface.defaultCatalog.id } : {}),
      sendDataModel: surface.sendDataModel,
      ...(surface.metadata === undefined ? {} : { metadata: surface.metadata }),
      ...(components.length > 0 ? { components } : {}),
      ...(isObject(dataModel) ? { dataModel } : {}),
    },
  });
}

/** The message kind, for example `createSurface`, or a description of the value. */
export function kindOf(message: unknown): string {
  if (!isObject(message)) {
    return 'a value that is not an object';
  }
  return MESSAGE_KINDS.find((kind) => kind in message) ?? 'a message of unknown kind';
}

function bodyOf(message: unknown): Message | undefined {
  if (!isObject(message)) {
    return undefined;
  }
  const kind = MESSAGE_KINDS.find((key) => key in message);
  const body = kind === undefined ? undefined : message[kind];
  return isObject(body) ? body : undefined;
}

function withSurfaceId(message: unknown, surfaceId: string): Message {
  const kind = kindOf(message);
  const original = message as Message;
  const body = bodyOf(message) ?? {};
  return { ...original, [kind]: { ...body, surfaceId } };
}

function isObject(value: unknown): value is Message {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
