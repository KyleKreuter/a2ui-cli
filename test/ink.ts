import { EventEmitter } from 'node:events';
import { stripVTControlCharacters } from 'node:util';
import { render as inkRender, type Instance } from 'ink';
import type { ReactElement } from 'react';

/** Waits until Ink has processed pending input and rendered the next frame. */
export async function settle(ms = 30): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** The frame without ANSI styling. */
export function plain(frame: string | undefined): string {
  return stripVTControlCharacters(frame ?? '');
}

/** Key sequences as a terminal sends them. */
export const keys = {
  tab: '\t',
  shiftTab: '\u001B[Z',
  enter: '\r',
  space: ' ',
  escape: '\u001B',
  backspace: '\u007F',
  left: '\u001B[D',
  right: '\u001B[C',
  ctrlLeft: '\u001B[1;5D',
  ctrlRight: '\u001B[1;5C',
  ctrlC: '\u0003',
} as const;

/** A fake terminal output whose width can change. */
export class FakeStdout extends EventEmitter {
  readonly isTTY = true;
  columns: number;
  rows = 40;
  readonly frames: string[] = [];

  constructor(columns = 100) {
    super();
    this.columns = columns;
  }

  write = (frame: string, ...rest: unknown[]): boolean => {
    if (frame !== '') {
      this.frames.push(frame);
    }
    const callback = rest.find((arg) => typeof arg === 'function') as (() => void) | undefined;
    callback?.();
    return true;
  };

  lastFrame = (): string | undefined => this.frames.at(-1);

  /** Changes the width and tells Ink about it, as a terminal resize does. */
  resize(columns: number): void {
    this.columns = columns;
    this.emit('resize');
  }
}

/** A fake terminal input that delivers written keys to Ink. */
export class FakeStdin extends EventEmitter {
  readonly isTTY = true;
  private data: string | null = null;

  write = (data: string): void => {
    this.data = data;
    this.emit('readable');
    this.emit('data', data);
  };

  read = (): string | null => {
    const { data } = this;
    this.data = null;
    return data;
  };

  setEncoding(): void {}
  setRawMode(): void {}
  resume(): void {}
  pause(): void {}
  ref(): void {}
  unref(): void {}
}

/**
 * Renders like `ink-testing-library`, but in interactive mode, so that Ink
 * handles terminal resizes.
 */
export function renderTty(tree: ReactElement, columns = 100) {
  const stdout = new FakeStdout(columns);
  const stdin = new FakeStdin();
  const stderr = new FakeStdout(columns);
  const instance = inkRender(tree, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
    stderr: stderr as unknown as NodeJS.WriteStream,
    debug: true,
    interactive: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });
  mounted.push(instance);
  return { ...instance, stdout, stdin, lastFrame: stdout.lastFrame };
}

const mounted: Instance[] = [];

/** Unmounts every tree rendered with {@link renderTty}. */
export function cleanupTty(): void {
  for (const instance of mounted.splice(0)) {
    instance.unmount();
  }
}
