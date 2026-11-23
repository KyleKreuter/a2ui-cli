import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { runDemo, type DemoIo } from './demo.js';

function fakeIo(stdinIsTty: boolean) {
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  stdin.isTTY = stdinIsTty;
  let stderr = '';
  const io: DemoIo = {
    stdin,
    stderr: {
      write: (chunk: string) => {
        stderr += chunk;
        return true;
      },
    } as NodeJS.WritableStream,
    logger: { file: '/dev/null', write: () => undefined },
  };
  return { io, stderr: () => stderr };
}

describe('runDemo', () => {
  it('names a missing file on stderr and exits with 1', async () => {
    const { io, stderr } = fakeIo(true);
    await expect(runDemo('missing.jsonl', io)).resolves.toBe(1);
    expect(stderr()).toBe('a2ui-term: cannot read missing.jsonl: no such file\n');
  });

  it('refuses to wait for typed input when stdin is a terminal', async () => {
    const { io, stderr } = fakeIo(true);
    await expect(runDemo(undefined, io)).resolves.toBe(1);
    expect(stderr()).toContain('no input');
  });
});
