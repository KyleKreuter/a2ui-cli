import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { setValue, signal } from '../a2ui/webcore.js';
import { useSignal } from './useSignal.js';
import { settle } from '../../test/ink.js';

describe('useSignal', () => {
  it('re-renders once when the signal changes', async () => {
    const count = signal(1);
    let renders = 0;
    function Counter() {
      renders += 1;
      return <Text>count {useSignal(count)}</Text>;
    }

    const { lastFrame } = render(<Counter />);
    expect(lastFrame()).toBe('count 1');
    const before = renders;

    setValue(count, 2);
    await settle();

    expect(lastFrame()).toBe('count 2');
    expect(renders - before).toBe(1);
  });
});
