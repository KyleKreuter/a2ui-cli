import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { A2uiRuntime, ActionEvent } from '../a2ui/processor.js';
import { TextInputFocusContext, createTextInputFocus } from './context.js';
import { Surface } from './Surface.js';
import { FOCUS_COLOR } from './theme.js';

export const EMPTY_STATE = 'Waiting for UI…';

const KEY_HELP = 'Tab next · Shift+Tab back · Enter press · q quit';
const SURFACE_KEY_HELP = 'Ctrl+←/→ surface';

/** Session details for the status line, shown while `serve` runs. */
export interface SessionStatus {
  readonly sessionId: string;
  readonly host: string;
  readonly clients: number;
}

export interface AppProps {
  readonly runtime: A2uiRuntime;
  readonly session?: SessionStatus;
}

/** The terminal frame: surface tabs, the shown surface, and a status line. */
export function App({ runtime, session }: AppProps) {
  const { exit } = useApp();
  const textInputFocus = useMemo(() => createTextInputFocus(), []);
  const surfaceIds = useSurfaceIds(runtime);
  const [selected, setSelected] = useState<string | undefined>(surfaceIds[0]);
  const lastAction = useLastAction(runtime);

  const shown = selected !== undefined && surfaceIds.includes(selected) ? selected : undefined;
  const surface = shown === undefined ? undefined : runtime.surfaces().get(shown);

  // When the shown surface disappears, show the one that took its place in the list.
  const previousIds = useRef(surfaceIds);
  useEffect(() => {
    if (shown === undefined && surfaceIds.length > 0) {
      const index = selected === undefined ? -1 : previousIds.current.indexOf(selected);
      setSelected(surfaceIds[Math.min(Math.max(index, 0), surfaceIds.length - 1)]);
    }
    previousIds.current = surfaceIds;
  }, [selected, shown, surfaceIds]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }
    if ((input === 'q' || key.escape) && !textInputFocus.isActive()) {
      exit();
      return;
    }
    if (key.ctrl && (key.leftArrow || key.rightArrow) && shown !== undefined) {
      const step = key.rightArrow ? 1 : -1;
      const index = surfaceIds.indexOf(shown);
      const next = surfaceIds[(index + step + surfaceIds.length) % surfaceIds.length];
      setSelected(next);
    }
  });

  return (
    <TextInputFocusContext value={textInputFocus}>
      <Box flexDirection="column">
        {surfaceIds.length > 1 && <SurfaceTabs ids={surfaceIds} shown={shown} />}
        <Box flexDirection="column" flexGrow={1}>
          {surface ? (
            <Surface key={shown} surface={surface} />
          ) : (
            <Text dimColor>{EMPTY_STATE}</Text>
          )}
        </Box>
        <StatusLine
          lastAction={lastAction}
          multipleSurfaces={surfaceIds.length > 1}
          session={session}
        />
      </Box>
    </TextInputFocusContext>
  );
}

function SurfaceTabs({ ids, shown }: { readonly ids: string[]; readonly shown?: string }) {
  return (
    <Box columnGap={1} marginBottom={1}>
      {ids.map((id) => (
        <Text key={id} inverse={id === shown} color={id === shown ? FOCUS_COLOR : undefined}>
          {` ${id} `}
        </Text>
      ))}
    </Box>
  );
}

function StatusLine({
  lastAction,
  multipleSurfaces,
  session,
}: {
  readonly lastAction?: ActionEvent;
  readonly multipleSurfaces: boolean;
  readonly session?: SessionStatus;
}) {
  const help = multipleSurfaces ? `${KEY_HELP} · ${SURFACE_KEY_HELP}` : KEY_HELP;
  return (
    <Box marginTop={1} columnGap={2} flexWrap="wrap">
      {session && (
        <Text>
          <Text dimColor>session</Text> <Text bold>{session.sessionId}</Text>
          <Text dimColor>
            {` · ${session.host} · ${session.clients} ${session.clients === 1 ? 'client' : 'clients'}`}
          </Text>
        </Text>
      )}
      <Text dimColor>{help}</Text>
      {lastAction && (
        <Text>
          <Text dimColor>last action:</Text> <Text bold>{lastAction.name}</Text>
        </Text>
      )}
    </Box>
  );
}

/** Surface ids in creation order, updated when surfaces are created or deleted. */
function useSurfaceIds(runtime: A2uiRuntime): string[] {
  const [ids, setIds] = useState(() => [...runtime.surfaces().keys()]);
  useEffect(() => {
    const sync = () => {
      setIds([...runtime.surfaces().keys()]);
    };
    const offCreated = runtime.onSurfaceCreated(sync);
    const offDeleted = runtime.onSurfaceDeleted(sync);
    sync();
    return () => {
      offCreated();
      offDeleted();
    };
  }, [runtime]);
  return ids;
}

function useLastAction(runtime: A2uiRuntime): ActionEvent | undefined {
  const [last, setLast] = useState<ActionEvent>();
  useEffect(() => runtime.onAction(setLast), [runtime]);
  return last;
}
