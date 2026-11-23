import type { Env } from '../session/id.js';

/*
 * The interface between the board core and a terminal host such as tmux. The
 * core decides from `capabilities`, never from the host name, so that a new
 * host needs only its own adapter file.
 */

/** Host-specific id of a pane, for example `%3` in tmux. */
export type PaneRef = string;

export interface CommandResult {
  /** Exit code, or null when the process was stopped. */
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** The process ran longer than the timeout and was stopped. */
  readonly timedOut: boolean;
}

/** Runs a program with an argument vector, never through a shell. */
export interface CommandRunner {
  run(argv: readonly string[]): Promise<CommandResult>;
}

export type Detection =
  | { readonly usable: true; readonly callerPane: PaneRef }
  | { readonly usable: false; readonly reason: string };

export type Placement = 'split' | 'window';
export type Direction = 'right' | 'down';

export interface OpenRequest {
  readonly callerPane: PaneRef;
  readonly placement: Placement;
  readonly direction: Direction;
  /** Size of a split in percent of the caller pane. */
  readonly size: number;
  /** The renderer command, one argument per entry. */
  readonly argv: readonly string[];
  /** Environment variables that the new pane must have, for example `XDG_RUNTIME_DIR`. */
  readonly env: Readonly<Record<string, string>>;
  /** Working directory of the new pane. */
  readonly cwd: string;
}

/**
 * The state of a pane: `live` while its command runs, `dead` when the command
 * exited but the pane stays open, `missing` when the pane is gone, and
 * `unknown` when the host could not tell.
 */
export type PaneState = 'live' | 'dead' | 'missing' | 'unknown';

export interface HostCapabilities {
  /** The adapter can close a pane. */
  readonly close: boolean;
  /** The adapter can tell whether the pane of a widget owner still exists. */
  readonly ownerCheck: boolean;
  /** The adapter can name the caller pane for the widget label. */
  readonly label: boolean;
}

export interface HostAdapter {
  /** Host name, also the prefix of owner ids, for example `tmux` in `tmux:%3`. */
  readonly name: string;
  readonly capabilities: HostCapabilities;
  /** Reads only environment variables and `PATH`, and starts no process. */
  detect(env: Env): Detection;
  /** Whether the host program is installed, for checks from outside the host. */
  installed(env: Env): boolean;
  /**
   * Identifies the host server that the environment points to, for example
   * the tmux socket path, or undefined outside the host. Pane ids are only
   * unique within one host server.
   */
  instance(env: Env): string | undefined;
  /** Opens a pane that runs the renderer, without moving the focus, and returns its id. */
  open(request: OpenRequest, runner: CommandRunner): Promise<PaneRef>;
  paneState(pane: PaneRef, runner: CommandRunner): Promise<PaneState>;
  label(pane: PaneRef, runner: CommandRunner): Promise<string | undefined>;
  close(pane: PaneRef, runner: CommandRunner): Promise<void>;
}

/** A host command failed or timed out. The message names the command and its stderr. */
export class HostCommandError extends Error {
  constructor(argv: readonly string[], result: CommandResult) {
    const command = argv.join(' ');
    const reason = result.timedOut
      ? 'did not finish within 3 seconds'
      : `failed with exit code ${result.code ?? 'unknown'}`;
    const stderr = result.stderr.trim();
    super(`${command} ${reason}${stderr ? `: ${stderr}` : ''}`);
    this.name = 'HostCommandError';
  }
}
