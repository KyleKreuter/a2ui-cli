import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_SOCKET_PATH_BYTES,
  RuntimeDirError,
  checkRuntimeDir,
  ensureRuntimeDir,
  runtimeDir,
  sessionPaths,
} from './paths.js';

let base: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'a2ui-paths-'));
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

const uid = process.getuid?.() ?? 0;

describe('runtimeDir', () => {
  it('uses XDG_RUNTIME_DIR when it is set', () => {
    expect(runtimeDir({ XDG_RUNTIME_DIR: '/run/user/1000' }, 1000)).toBe(
      '/run/user/1000/a2ui-term',
    );
  });

  it('uses the os temporary directory with the uid otherwise', () => {
    expect(runtimeDir({}, 501)).toBe(join(tmpdir(), 'a2ui-term-501'));
  });
});

describe('ensureRuntimeDir', () => {
  it('creates the directory with mode 0700', () => {
    const dir = join(base, 'run');
    ensureRuntimeDir(dir);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });

  it('accepts an existing private directory', () => {
    const dir = join(base, 'run');
    mkdirSync(dir, { mode: 0o700 });
    expect(() => {
      ensureRuntimeDir(dir);
    }).not.toThrow();
  });

  it('refuses a directory with mode 0777 and names it', () => {
    const dir = join(base, 'run');
    mkdirSync(dir);
    chmodSync(dir, 0o777);
    expect(() => {
      ensureRuntimeDir(dir);
    }).toThrow(
      new RuntimeDirError(
        `${dir} has mode 0777; it must be 0700. Remove it or run chmod 700 on it.`,
      ),
    );
  });

  it('refuses a directory of another user', () => {
    const dir = join(base, 'run');
    mkdirSync(dir, { mode: 0o700 });
    expect(() => {
      ensureRuntimeDir(dir, uid + 1);
    }).toThrow(`${dir} belongs to another user`);
  });

  it('refuses a file in place of the directory', () => {
    const dir = join(base, 'run');
    writeFileSync(dir, '');
    expect(() => {
      ensureRuntimeDir(dir);
    }).toThrow('is not a directory');
  });
});

describe('checkRuntimeDir', () => {
  it('returns false for a missing directory and creates nothing', () => {
    const dir = join(base, 'run');
    expect(checkRuntimeDir(dir)).toBe(false);
    expect(() => statSync(dir)).toThrow();
  });

  it('refuses a directory with broad permissions', () => {
    const dir = join(base, 'run');
    mkdirSync(dir);
    chmodSync(dir, 0o755);
    expect(() => checkRuntimeDir(dir)).toThrow(RuntimeDirError);
  });
});

describe('sessionPaths', () => {
  it('returns the socket and state file of a session', () => {
    expect(sessionPaths('/run/a2ui-term', 't')).toEqual({
      socket: '/run/a2ui-term/t.sock',
      state: '/run/a2ui-term/t.json',
    });
  });

  it('refuses a socket path above the limit', () => {
    const dir = `/${'d'.repeat(MAX_SOCKET_PATH_BYTES - 8)}`;
    expect(() => sessionPaths(dir, 'a')).not.toThrow();
    expect(() => sessionPaths(dir, 'ab')).toThrow(/has \d+ bytes; the limit is/);
  });
});
