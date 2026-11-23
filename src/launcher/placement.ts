import type { Direction, Placement } from '../hosts/types.js';
import type { Env } from '../session/id.js';

export const PLACEMENT_ENV = 'A2UI_TERM_PLACEMENT';
export const DIRECTION_ENV = 'A2UI_TERM_DIRECTION';
export const SIZE_ENV = 'A2UI_TERM_SIZE';

const PLACEMENTS: readonly Placement[] = ['split', 'window'];
const DIRECTIONS: readonly Direction[] = ['right', 'down'];
export const MIN_SIZE = 10;
export const MAX_SIZE = 90;

export interface PlacementSettings {
  readonly placement: Placement;
  readonly direction: Direction;
  /** Size of a split in percent of the caller pane. */
  readonly size: number;
}

/** Placement settings as the user wrote them, before validation. */
export interface PlacementInput {
  readonly placement?: string;
  readonly direction?: string;
  readonly size?: string;
}

/** A placement setting with a value outside its allowed values. */
export class PlacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlacementError';
  }
}

/**
 * Resolves each setting from the flag, then its environment variable, then the
 * default: `split`, `right` and `40`. Throws {@link PlacementError} for an
 * invalid value.
 */
export function resolvePlacement(input: PlacementInput, env: Env): PlacementSettings {
  return {
    placement: oneOf('placement', input.placement ?? env[PLACEMENT_ENV], PLACEMENTS, 'split'),
    direction: oneOf('direction', input.direction ?? env[DIRECTION_ENV], DIRECTIONS, 'right'),
    size: sizeOf(input.size ?? env[SIZE_ENV]),
  };
}

function oneOf<T extends string>(
  setting: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }
  if (!(allowed as readonly string[]).includes(value)) {
    throw new PlacementError(
      `invalid ${setting} "${value}": use ${allowed.map((item) => `"${item}"`).join(' or ')}`,
    );
  }
  return value as T;
}

function sizeOf(value: string | undefined): number {
  if (!value) {
    return 40;
  }
  const size = Number(value);
  if (!/^\d+$/.test(value) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new PlacementError(
      `invalid size "${value}": use a whole number of percent from ${MIN_SIZE} to ${MAX_SIZE}`,
    );
  }
  return size;
}
