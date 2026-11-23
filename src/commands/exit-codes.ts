/** Exit codes of `serve`, `send`, `ask` and `close`. Scripts branch on them. */
export const ExitCode = {
  ok: 0,
  /** Any other error, for example no renderer reachable or invalid flags. */
  error: 1,
  /** `ask` got no action before `--timeout`. */
  timeout: 2,
  /** The user closed the renderer while `ask` waited. */
  userClosed: 3,
  /** The input could not be parsed, or the renderer rejected a message. */
  inputError: 4,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
