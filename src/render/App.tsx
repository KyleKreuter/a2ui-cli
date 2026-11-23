import { useApp, useInput } from 'ink';
import { useMemo, useState } from 'react';
import type { WidgetBoard } from '../board/registry.js';
import { Board, type SessionStatus } from './Board.js';
import { TextInputFocusContext, createTextInputFocus } from './context.js';

export { EMPTY_STATE, type SessionStatus } from './Board.js';

export interface AppProps {
  readonly board: WidgetBoard;
  readonly session?: SessionStatus;
}

/** The terminal frame: the widget board and the global keys. */
export function App({ board, session }: AppProps) {
  const { exit } = useApp();
  const textInputFocus = useMemo(() => createTextInputFocus(), []);
  const [help, setHelp] = useState(false);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }
    if (textInputFocus.isActive()) {
      return;
    }
    if (input === 'q' || key.escape) {
      exit();
    } else if (input === '?') {
      setHelp((shown) => !shown);
    }
  });

  return (
    <TextInputFocusContext value={textInputFocus}>
      <Board board={board} session={session} help={help} />
    </TextInputFocusContext>
  );
}
