import { detectHostPane } from './host.js';
import type { Env } from './id.js';

/** Environment variable that names the widget owner when no flag does. */
export const OWNER_ENV = 'A2UI_TERM_OWNER';

/** Environment variable that names the widget label when no flag does. */
export const LABEL_ENV = 'A2UI_TERM_LABEL';

/**
 * Resolves the owner of the caller from the `--owner` flag, then
 * `A2UI_TERM_OWNER`, then `<host>:<pane id>` of the host pane, for example
 * `tmux:%3`. The host prefix names the host adapter that can check the pane.
 * Returns undefined when nothing names an owner.
 */
export function resolveOwner(flag: string | undefined, env: Env = process.env): string | undefined {
  const given = flag || env[OWNER_ENV];
  if (given) {
    return given;
  }
  const pane = detectHostPane(env);
  return pane ? `${pane.host}:${pane.paneId}` : undefined;
}

/** Resolves the label from the `--label` flag, then `A2UI_TERM_LABEL`, then the owner. */
export function resolveLabel(
  flag: string | undefined,
  owner: string | undefined,
  env: Env = process.env,
): string | undefined {
  return flag || env[LABEL_ENV] || owner;
}
