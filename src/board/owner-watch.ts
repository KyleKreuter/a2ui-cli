import { adapterNamed } from '../hosts/select.js';
import type { CommandRunner, HostAdapter } from '../hosts/types.js';
import type { Env } from '../session/id.js';
import type { WidgetBoard } from './registry.js';

/** How often the board checks the owner panes of its widgets. */
export const OWNER_CHECK_MS = 2000;

export interface OwnerWatchOptions {
  readonly adapters: readonly HostAdapter[];
  readonly runner: CommandRunner;
  readonly env: Env;
  readonly intervalMs?: number;
}

/**
 * Checks the owner pane of every widget that has not ended, and marks the
 * widgets of a pane that is gone or whose command exited as ended. Owners
 * whose host prefix names no adapter with the owner check, or a host program
 * that is not installed, are skipped. Returns a function that stops the checks.
 */
export function watchOwners(board: WidgetBoard, options: OwnerWatchOptions): () => void {
  const installed = new Map<HostAdapter, boolean>();
  const checkable = (adapter: HostAdapter | undefined): adapter is HostAdapter => {
    if (!adapter?.capabilities.ownerCheck) {
      return false;
    }
    let known = installed.get(adapter);
    if (known === undefined) {
      known = adapter.installed(options.env);
      installed.set(adapter, known);
    }
    return known;
  };

  let running = false;
  const check = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      await Promise.all(
        board.liveOwners().map(async (owner) => {
          const separator = owner.indexOf(':');
          if (separator <= 0) {
            return;
          }
          const adapter = adapterNamed(owner.slice(0, separator), options.adapters);
          if (!checkable(adapter)) {
            return;
          }
          const state = await adapter.paneState(owner.slice(separator + 1), options.runner);
          if (state === 'missing' || state === 'dead') {
            board.markEnded(owner);
          }
        }),
      );
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void check();
  }, options.intervalMs ?? OWNER_CHECK_MS);
  return () => {
    clearInterval(timer);
  };
}
