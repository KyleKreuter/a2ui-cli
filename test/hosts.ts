import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommandResult, CommandRunner } from '../src/hosts/types.js';

type Script = (argv: readonly string[]) => Partial<CommandResult> | undefined;

/**
 * Records every command and answers with scripted results. A command without a
 * script exits with 0 and prints nothing.
 */
export class FakeRunner implements CommandRunner {
  readonly calls: string[][] = [];
  private readonly scripts: Script[] = [];

  /** Answers commands that `script` returns a result for. Later scripts win. */
  on(script: Script): this {
    this.scripts.unshift(script);
    return this;
  }

  /** Answers every command whose argv starts with `prefix`. */
  when(prefix: readonly string[], result: Partial<CommandResult>): this {
    return this.on((argv) =>
      prefix.every((part, index) => argv[index] === part) ? result : undefined,
    );
  }

  run(argv: readonly string[]): Promise<CommandResult> {
    this.calls.push([...argv]);
    for (const script of this.scripts) {
      const result = script(argv);
      if (result) {
        return Promise.resolve({ code: 0, stdout: '', stderr: '', timedOut: false, ...result });
      }
    }
    return Promise.resolve({ code: 0, stdout: '', stderr: '', timedOut: false });
  }
}

/** A directory for `PATH` that holds an executable file for each name. */
export function pathWith(...programs: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'a2ui-path-'));
  for (const program of programs) {
    const path = join(dir, program);
    writeFileSync(path, '#!/bin/sh\n');
    chmodSync(path, 0o755);
  }
  return dir;
}

/** `TMUX` of the fake tmux server: socket path, server pid and session index. */
export const TMUX = '/tmp/tmux-501/default,4242,0';

/** Environment of a caller in tmux pane `pane`, with a fake `tmux` on `PATH`. */
export function tmuxEnv(pane = '%3', tmux = TMUX): Record<string, string> {
  return { TMUX: tmux, TMUX_PANE: pane, PATH: pathWith('tmux') };
}
