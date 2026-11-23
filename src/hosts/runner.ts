import { execFile } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { Env } from '../session/id.js';
import type { CommandResult, CommandRunner } from './types.js';

/** Host commands that run longer are stopped. */
export const COMMAND_TIMEOUT_MS = 3000;

/**
 * Runs host programs with `execFile`, so arguments reach the program literally
 * and no shell interprets them. Stops a program after the timeout.
 */
export class ProcessRunner implements CommandRunner {
  constructor(
    private readonly env: Env = process.env,
    private readonly timeoutMs = COMMAND_TIMEOUT_MS,
  ) {}

  run(argv: readonly string[]): Promise<CommandResult> {
    const [program, ...args] = argv;
    if (program === undefined) {
      return Promise.reject(new Error('cannot run an empty command'));
    }
    return new Promise((resolve) => {
      execFile(
        program,
        args,
        { shell: false, timeout: this.timeoutMs, killSignal: 'SIGKILL', env: { ...this.env } },
        (error, stdout, stderr) => {
          const failure = error as (NodeJS.ErrnoException & { killed?: boolean }) | null;
          resolve({
            code: failure ? (typeof failure.code === 'number' ? failure.code : null) : 0,
            stdout,
            stderr: failure && typeof failure.code === 'string' ? failure.message : stderr,
            timedOut: failure?.killed === true,
          });
        },
      );
    });
  }
}

/** Whether `program` is an executable file in a directory of `PATH`. Starts no process. */
export function findProgram(program: string, env: Env = process.env): boolean {
  for (const dir of (env.PATH ?? '').split(delimiter)) {
    if (!dir) {
      continue;
    }
    const path = join(dir, program);
    try {
      if (statSync(path).isFile()) {
        accessSync(path, constants.X_OK);
        return true;
      }
    } catch {
      // Not in this directory.
    }
  }
  return false;
}
