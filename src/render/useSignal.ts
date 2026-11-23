import { useCallback, useSyncExternalStore } from 'react';
import { effect, getValue, peekValue, type Signal } from '../a2ui/webcore.js';

/** Returns the current value of a `web_core` signal and re-renders when it changes. */
export function useSignal<T>(signal: Signal<T>): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      let initialRun = true;
      return effect(() => {
        getValue(signal);
        if (initialRun) {
          initialRun = false;
          return;
        }
        onChange();
      });
    },
    [signal],
  );
  const read = useCallback(() => peekValue(signal), [signal]);
  return useSyncExternalStore(subscribe, read);
}
