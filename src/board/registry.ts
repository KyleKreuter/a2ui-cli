import type { A2uiRuntime, ActionHandler } from '../a2ui/processor.js';
import { PROTOCOL_VERSION } from '../a2ui/processor.js';
import type { SurfaceModel } from '../a2ui/webcore.js';
import { kindOf, rewriteAdd, rewriteUpdate, tryMessages } from './apply.js';

/** Number of columns of the board grid. A widget of this width fills a row. */
export const GRID_COLUMNS = 12;

/** Width of a widget when `add` names none. */
export const DEFAULT_WIDTH = 6;

/** Widget ids that the board assigns. Plain messages cannot create surfaces with them. */
const RESERVED_ID = /^w\d+$/;

/** One widget on the board: a surface with layout and owner details. */
export interface Widget {
  readonly id: string;
  /** Width in grid columns, 1 to {@link GRID_COLUMNS}. */
  readonly width: number;
  readonly title?: string;
  readonly label?: string;
  readonly owner?: string;
  /** The owner pane is gone. The widget stays until `remove --ended`. */
  readonly ended?: boolean;
  readonly surface: SurfaceModel;
}

/** A widget as `list` reports it. */
export interface WidgetInfo {
  readonly widgetId: string;
  readonly title: string | null;
  readonly label: string | null;
  readonly owner: string | null;
  readonly width: number;
  /** Index in board order, from 0. */
  readonly position: number;
  readonly ended: boolean;
}

export interface AddRequest {
  readonly messages: readonly unknown[];
  readonly width?: number;
  readonly title?: string;
  readonly owner?: string;
  readonly label?: string;
}

/** Which widgets `remove` removes: the named ones, every widget of one owner, or the ended ones. */
export type RemoveTarget =
  { readonly widgetIds: readonly string[] } | { readonly owner: string } | { readonly ended: true };

export type BoardResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

type Details = Omit<Widget, 'id' | 'surface'>;

/**
 * The widgets of one renderer, in board order. Every surface of the runtime is
 * a widget: `add` creates widgets with the ids `w1`, `w2`, ..., and a surface
 * from a plain `a2ui` message becomes a full-width widget with its surface id.
 */
export class WidgetBoard {
  private nextNumber = 1;
  private readonly details = new Map<string, Details>();
  private pending: Details | undefined;
  private shown: readonly Widget[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly unsubscribe: (() => void)[];

  constructor(readonly runtime: A2uiRuntime) {
    this.unsubscribe = [
      runtime.onSurfaceCreated((surface) => {
        this.details.set(surface.id, this.pending ?? { width: GRID_COLUMNS });
        this.changed();
      }),
      runtime.onSurfaceDeleted((surfaceId) => {
        this.details.delete(surfaceId);
        this.changed();
      }),
    ];
    for (const surfaceId of runtime.surfaces().keys()) {
      this.details.set(surfaceId, { width: GRID_COLUMNS });
    }
    this.changed();
  }

  /** The widgets in board order. The array changes identity on every change. */
  widgets(): readonly Widget[] {
    return this.shown;
  }

  /** Calls `listener` when a widget is added or removed. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onAction(handler: ActionHandler): () => void {
    return this.runtime.onAction(handler);
  }

  /** Applies plain A2UI messages, each on its own. Rejects reserved surface ids. */
  apply(messages: readonly unknown[]): readonly { readonly message: string }[] {
    return messages.flatMap((message) => {
      const reserved = reservedIdOf(message);
      if (reserved !== undefined) {
        return [
          {
            message: `Surface id ${reserved} is reserved for widgets that add creates. Use another surface id.`,
          },
        ];
      }
      return this.runtime.apply([message]);
    });
  }

  /** Creates a widget from messages with exactly one `createSurface`, all or nothing. */
  add(request: AddRequest): BoardResult<string> {
    const width = request.width ?? DEFAULT_WIDTH;
    if (!Number.isInteger(width) || width < 1 || width > GRID_COLUMNS) {
      return { ok: false, error: `width must be a whole number from 1 to ${GRID_COLUMNS}` };
    }
    const widgetId = `w${this.nextNumber}`;
    const checked = rewriteAdd(request.messages, widgetId);
    if (!checked.ok) {
      return checked;
    }
    const errors = tryMessages(checked.messages);
    if (errors.length > 0) {
      return { ok: false, error: errors.join('\n') };
    }
    this.nextNumber += 1;
    this.pending = {
      width,
      ...optional('title', request.title),
      ...optional('label', request.label),
      ...optional('owner', request.owner),
    };
    try {
      const applied = this.runtime.apply(checked.messages);
      if (applied.length > 0) {
        this.runtime.apply([deleteSurface(widgetId)]);
        return { ok: false, error: applied.map((error) => error.message).join('\n') };
      }
    } finally {
      this.pending = undefined;
    }
    return { ok: true, value: widgetId };
  }

  /** Applies `updateComponents` and `updateDataModel` messages to a widget, all or nothing. */
  update(widgetId: string, messages: readonly unknown[]): BoardResult<void> {
    const surface = this.runtime.surfaces().get(widgetId);
    if (!surface) {
      return { ok: false, error: unknownWidget(widgetId) };
    }
    const checked = rewriteUpdate(messages, widgetId);
    if (!checked.ok) {
      return checked;
    }
    const errors = tryMessages(checked.messages, surface);
    if (errors.length > 0) {
      return { ok: false, error: errors.join('\n') };
    }
    const applied = this.runtime.apply(checked.messages);
    if (applied.length > 0) {
      return { ok: false, error: applied.map((error) => error.message).join('\n') };
    }
    return { ok: true, value: undefined };
  }

  /**
   * Removes the named widgets, or every widget of one owner, and returns their
   * ids. Removes nothing when one of the named ids does not exist.
   */
  remove(target: RemoveTarget): BoardResult<string[]> {
    let ids: string[];
    if ('owner' in target) {
      ids = this.shown.filter((widget) => widget.owner === target.owner).map(({ id }) => id);
    } else if ('ended' in target) {
      ids = this.shown.filter((widget) => widget.ended).map(({ id }) => id);
    } else {
      ids = [...new Set(target.widgetIds)];
      const unknown = ids.find((id) => !this.details.has(id));
      if (unknown !== undefined) {
        return { ok: false, error: unknownWidget(unknown) };
      }
    }
    this.runtime.apply(ids.map(deleteSurface));
    return { ok: true, value: ids };
  }

  /** The distinct owners of the widgets that have not ended, in board order. */
  liveOwners(): string[] {
    const owners = this.shown.flatMap((widget) =>
      widget.owner && !widget.ended ? [widget.owner] : [],
    );
    return [...new Set(owners)];
  }

  /** Marks every widget of `owner` as ended. Ended widgets stay ended. */
  markEnded(owner: string): void {
    let changed = false;
    for (const [id, details] of this.details) {
      if (details.owner === owner && !details.ended) {
        this.details.set(id, { ...details, ended: true });
        changed = true;
      }
    }
    if (changed) {
      this.changed();
    }
  }

  /** Removes every widget. Widget ids keep counting up. */
  clear(): void {
    this.runtime.clear();
  }

  list(): WidgetInfo[] {
    return this.shown.map((widget, position) => ({
      widgetId: widget.id,
      title: widget.title ?? null,
      label: widget.label ?? null,
      owner: widget.owner ?? null,
      width: widget.width,
      position,
      ended: widget.ended === true,
    }));
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribe) {
      unsubscribe();
    }
    this.listeners.clear();
  }

  private changed(): void {
    const surfaces = this.runtime.surfaces();
    this.shown = [...this.details].flatMap(([id, details]) => {
      const surface = surfaces.get(id);
      return surface ? [{ id, ...details, surface }] : [];
    });
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** The surface id of a plain `createSurface` message when it is a reserved widget id. */
function reservedIdOf(message: unknown): string | undefined {
  if (kindOf(message) !== 'createSurface') {
    return undefined;
  }
  const body = (message as { createSurface: unknown }).createSurface;
  const surfaceId =
    typeof body === 'object' && body !== null && 'surfaceId' in body ? body.surfaceId : undefined;
  return typeof surfaceId === 'string' && RESERVED_ID.test(surfaceId) ? surfaceId : undefined;
}

function deleteSurface(surfaceId: string) {
  return { version: PROTOCOL_VERSION, deleteSurface: { surfaceId } };
}

function unknownWidget(widgetId: string): string {
  return `widget ${widgetId} does not exist`;
}

function optional<K extends string>(key: K, value: string | undefined): { [P in K]?: string } {
  return (value ? { [key]: value } : {}) as { [P in K]?: string };
}
