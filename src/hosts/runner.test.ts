import { describe, expect, it } from 'vitest';
import { pathWith } from '../../test/hosts.js';
import { ProcessRunner, findProgram } from './runner.js';

describe('ProcessRunner', () => {
  it('passes an argument with shell characters as one literal argument', async () => {
    const result = await new ProcessRunner().run(['printf', '%s', 'x;rm -rf ~']);
    expect(result).toEqual({ code: 0, stdout: 'x;rm -rf ~', stderr: '', timedOut: false });
  });

  it('reports the exit code and stderr of a failing program', async () => {
    const result = await new ProcessRunner().run(['sh', '-c', 'echo bad >&2; exit 3']);
    expect(result).toMatchObject({ code: 3, stderr: 'bad\n', timedOut: false });
  });

  it('stops a program that runs longer than the timeout', async () => {
    const started = Date.now();
    const result = await new ProcessRunner(process.env, 100).run(['sleep', '5']);
    expect(result).toMatchObject({ code: null, timedOut: true });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('reports a missing program', async () => {
    const result = await new ProcessRunner().run(['a2ui-term-no-such-program']);
    expect(result.code).toBeNull();
    expect(result.stderr).toContain('ENOENT');
  });
});

describe('findProgram', () => {
  it('finds an executable file on PATH without starting a process', () => {
    expect(findProgram('tmux', { PATH: `/nowhere:${pathWith('tmux')}` })).toBe(true);
  });

  it('does not find a missing program', () => {
    expect(findProgram('tmux', { PATH: pathWith('other') })).toBe(false);
    expect(findProgram('tmux', {})).toBe(false);
  });
});
