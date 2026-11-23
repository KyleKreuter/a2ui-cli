import type { DOMElement } from 'ink';
import { createContext, useContext, useEffect, useRef } from 'react';

/** Scrolls the board so that the given box is visible. */
export type Reveal = (node: DOMElement) => void;

export const RevealContext = createContext<Reveal>(() => undefined);

/**
 * Returns a ref for the box of a focusable component. While the component has
 * focus, the board scrolls that box into view.
 */
export function useRevealOnFocus(isFocused: boolean) {
  const ref = useRef<DOMElement>(null);
  const reveal = useContext(RevealContext);
  useEffect(() => {
    if (isFocused && ref.current) {
      reveal(ref.current);
    }
  }, [isFocused, reveal]);
  return ref;
}
