import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger, defaultLogFile } from './log.js';

describe('createLogger', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('appends JSON lines to the file and nothing to stdout or stderr', () => {
    dir = mkdtempSync(join(tmpdir(), 'a2ui-term-log-'));
    const file = join(dir, 'nested', 'a2ui-term.log');
    const stdout = vi.spyOn(process.stdout, 'write');
    const stderr = vi.spyOn(process.stderr, 'write');

    const logger = createLogger(file);
    logger.write('action', { name: 'submit' });
    logger.write('error', { message: 'bad' });

    const lines = readFileSync(file, 'utf8').trimEnd().split('\n');
    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      { time: expect.any(String) as unknown, event: 'action', name: 'submit' },
      { time: expect.any(String) as unknown, event: 'error', message: 'bad' },
    ]);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
  });

  it('drops a write that fails', () => {
    dir = mkdtempSync(join(tmpdir(), 'a2ui-term-log-'));
    const logger = createLogger(dir);
    expect(() => {
      logger.write('action');
    }).not.toThrow();
  });
});

describe('defaultLogFile', () => {
  it('names the log file after the tool', () => {
    expect(defaultLogFile()).toMatch(/a2ui-term[/\\]a2ui-term\.log$/);
  });
});
