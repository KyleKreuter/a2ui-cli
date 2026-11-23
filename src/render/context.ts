import { createContext, useContext } from 'react';

/** Style that a component passes down to the Text components inside it. */
export interface TextStyle {
  readonly color?: string;
  readonly bold?: boolean;
  readonly dimColor?: boolean;
}

export const TextStyleContext = createContext<TextStyle>({});

export function useTextStyle(): TextStyle {
  return useContext(TextStyleContext);
}

/**
 * Tracks whether a text input has focus, so that global keys such as `q`
 * reach the input instead of quitting.
 */
export interface TextInputFocus {
  enter(id: string): void;
  leave(id: string): void;
  isActive(): boolean;
}

export function createTextInputFocus(): TextInputFocus {
  const focused = new Set<string>();
  return {
    enter: (id) => focused.add(id),
    leave: (id) => focused.delete(id),
    isActive: () => focused.size > 0,
  };
}

export const TextInputFocusContext = createContext<TextInputFocus>(createTextInputFocus());
