import type { Env } from '../session/id.js';
import { tmuxAdapter } from './tmux.js';
import type { HostAdapter, PaneRef } from './types.js';

/**
 * The host adapters, in detection order. A new host adds its adapter file and
 * one entry here.
 */
export const HOST_ADAPTERS: readonly HostAdapter[] = [tmuxAdapter];

export type HostSelection =
  | { readonly adapter: HostAdapter; readonly callerPane: PaneRef }
  | { readonly adapter: undefined; readonly reasons: readonly string[] };

/** The first adapter that can open panes from the caller's environment. */
export function selectHost(
  env: Env,
  adapters: readonly HostAdapter[] = HOST_ADAPTERS,
): HostSelection {
  const reasons: string[] = [];
  for (const adapter of adapters) {
    const detection = adapter.detect(env);
    if (detection.usable) {
      return { adapter, callerPane: detection.callerPane };
    }
    reasons.push(`${adapter.name}: ${detection.reason}`);
  }
  return { adapter: undefined, reasons };
}

/** The adapter for a host name, for example the prefix of the owner `tmux:%3`. */
export function adapterNamed(
  name: string,
  adapters: readonly HostAdapter[] = HOST_ADAPTERS,
): HostAdapter | undefined {
  return adapters.find((adapter) => adapter.name === name);
}
