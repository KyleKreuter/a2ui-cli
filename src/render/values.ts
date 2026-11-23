import { ResolvedBinding, WritableBinding } from '../a2ui/webcore.js';

/** Unwraps a resolved prop: bindings give their current value, plain values pass through. */
export function valueOf(prop: unknown): unknown {
  return prop instanceof ResolvedBinding ? (prop as ResolvedBinding<unknown>).value : prop;
}

/** A resolved prop as display text. Missing values become an empty string. */
export function textOf(prop: unknown): string {
  const value = valueOf(prop);
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value);
}

/** The setter of a two-way binding, or `undefined` if the prop is not bound to a path. */
export function setterOf(prop: unknown): ((value: unknown) => void) | undefined {
  return prop instanceof WritableBinding ? (prop as WritableBinding<unknown>).set : undefined;
}

/** A string prop with a fixed set of values, such as `variant`. */
export function enumOf<T extends string>(prop: unknown, allowed: readonly T[], fallback: T): T {
  return typeof prop === 'string' && (allowed as readonly string[]).includes(prop)
    ? (prop as T)
    : fallback;
}
