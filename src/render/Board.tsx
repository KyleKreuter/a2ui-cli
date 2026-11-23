import {
  Box,
  Text,
  measureElement,
  useBoxMetrics,
  useInput,
  useWindowSize,
  type DOMElement,
} from 'ink';
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { GRID_COLUMNS, type Widget, type WidgetBoard } from '../board/registry.js';
import { TextInputFocusContext } from './context.js';
import { RevealContext } from './reveal.js';
import { Surface } from './Surface.js';
import { FOCUS_COLOR } from './theme.js';

/** Shown while the board has no widgets. */
export const EMPTY_STATE = 'No widgets yet. Add one with: a2ui-term add --title <title> <file>';

/** Below this terminal width, every widget takes the full width. */
export const NARROW_COLUMNS = 80;

/** The keys of the board, shown with `?`. */
export const KEY_HELP = [
  ['Tab, Shift+Tab', 'move the focus'],
  ['Enter, Space', 'press the focused component'],
  ['PgUp, PgDn', 'scroll one page'],
  ['Home, End', 'scroll to the top or the bottom'],
  ['↑, ↓', 'scroll one line'],
  ['?', 'show or hide these keys'],
  ['q, Esc', 'quit'],
] as const;

/** Session details for the status line, shown while `serve` runs. */
export interface SessionStatus {
  readonly sessionId: string;
  readonly clients: number;
}

export interface BoardProps {
  readonly board: WidgetBoard;
  readonly session?: SessionStatus;
  /** Shows the key list above the status line. */
  readonly help?: boolean;
}

/**
 * All widgets in a 12-column grid inside a scrollable viewport, with a status
 * line below. Fills the terminal exactly, so Ink never clears the screen.
 */
export function Board({ board, session, help = false }: BoardProps) {
  const widgets = useWidgets(board);
  const { columns, rows } = useWindowSize();
  const textInputFocus = useContext(TextInputFocusContext);
  const viewportHeight = Math.max(1, rows - 1 - (help ? KEY_HELP.length : 0));

  const content = useRef<DOMElement>(null);
  const { height: contentHeight, hasMeasured } = useBoxMetrics(content);
  const maxOffset = Math.max(0, contentHeight - viewportHeight);
  const [offset, setOffset] = useState(0);
  const shown = Math.min(offset, maxOffset);

  // Keep the offset when content changes, unless it would pass the new end.
  // React re-renders right away when state changes during render.
  if (hasMeasured && offset > maxOffset) {
    setOffset(maxOffset);
  }

  const view = useRef({ viewportHeight, maxOffset });
  useLayoutEffect(() => {
    view.current = { viewportHeight, maxOffset };
  });
  const reveal = useCallback((node: DOMElement) => {
    if (!content.current) {
      return;
    }
    const top = measureElement(node).y - measureElement(content.current).y;
    const bottom = top + measureElement(node).height;
    setOffset((current) => {
      const { viewportHeight: height, maxOffset: max } = view.current;
      const next = top < current ? top : bottom > current + height ? bottom - height : current;
      return Math.max(0, Math.min(next, max));
    });
  }, []);

  useInput((input, key) => {
    const scrollBy = (rowsToScroll: number) => {
      setOffset((current) => Math.max(0, Math.min(current + rowsToScroll, maxOffset)));
    };
    if (key.pageDown) {
      scrollBy(viewportHeight);
    } else if (key.pageUp) {
      scrollBy(-viewportHeight);
    } else if (key.home) {
      setOffset(0);
    } else if (key.end) {
      setOffset(maxOffset);
    } else if ((key.downArrow || key.upArrow) && !textInputFocus.isActive()) {
      scrollBy(key.downArrow ? 1 : -1);
    }
  });

  return (
    <RevealContext value={reveal}>
      <Box flexDirection="column" height={rows} width={columns}>
        <Box
          height={viewportHeight}
          flexShrink={0}
          flexDirection="column"
          overflowY="hidden"
          contentOffsetY={shown}
        >
          <Box
            ref={content}
            flexShrink={0}
            flexDirection="row"
            flexWrap="wrap"
            alignItems="flex-start"
            width={columns}
          >
            {widgets.length === 0 ? (
              <Text dimColor>{EMPTY_STATE}</Text>
            ) : (
              widgets.map((widget) => (
                <WidgetFrame
                  key={widget.id}
                  widget={widget}
                  width={widgetWidth(widget.width, columns)}
                />
              ))
            )}
          </Box>
        </Box>
        {help && <KeyHelp />}
        <StatusLine
          session={session}
          widgets={widgets.length}
          above={shown > 0}
          below={shown < maxOffset}
        />
      </Box>
    </RevealContext>
  );
}

/** Width of a widget in terminal columns. */
export function widgetWidth(gridColumns: number, terminalColumns: number): number {
  if (terminalColumns < NARROW_COLUMNS) {
    return terminalColumns;
  }
  return Math.max(1, Math.floor((terminalColumns * gridColumns) / GRID_COLUMNS));
}

/** One widget: a rounded border whose top line names the widget, around its surface. */
function WidgetFrame({ widget, width }: { readonly widget: Widget; readonly width: number }) {
  return (
    <Box flexDirection="column" width={width} flexShrink={0}>
      <TopBorder widget={widget} width={width} />
      <Box flexDirection="column" borderStyle="round" borderTop={false} borderDimColor paddingX={1}>
        <Surface surface={widget.surface} />
      </Box>
    </Box>
  );
}

/** `╭─ Build · api-agent · w3 ───╮`, cut to the frame width. */
function TopBorder({ widget, width }: { readonly widget: Widget; readonly width: number }) {
  const caption = frameCaption(widget);
  // Room for "╭─ ", " ─" and "╮" around the caption.
  const room = width - 6;
  if (room < 1) {
    return <Text dimColor>{`╭${'─'.repeat(Math.max(0, width - 2))}╮`}</Text>;
  }
  const text = caption.length > room ? `${caption.slice(0, room - 1)}…` : caption;
  const fill = '─'.repeat(width - 5 - text.length);
  const parts = text === caption ? captionParts(widget) : [{ text, bold: false, dim: false }];
  return (
    <Text wrap="truncate">
      <Text dimColor>╭─ </Text>
      {parts.map((part, index) => (
        <Text key={index} bold={part.bold} dimColor={part.dim}>
          {part.text}
        </Text>
      ))}
      <Text dimColor>{` ${fill}╮`}</Text>
    </Text>
  );
}

/** The text of the top border line: title, label and widget id. */
export function frameCaption(widget: Pick<Widget, 'id' | 'title' | 'label'>): string {
  return [widget.title, widget.label, widget.id].filter(Boolean).join(' · ');
}

function captionParts(widget: Widget) {
  const parts: { text: string; bold: boolean; dim: boolean }[] = [];
  const add = (text: string | undefined, bold: boolean, dim: boolean) => {
    if (!text) {
      return;
    }
    if (parts.length > 0) {
      parts.push({ text: ' · ', bold: false, dim: true });
    }
    parts.push({ text, bold, dim });
  };
  add(widget.title, true, false);
  add(widget.label, false, true);
  add(widget.id, false, false);
  return parts;
}

function KeyHelp() {
  return (
    <Box flexDirection="column" flexShrink={0}>
      {KEY_HELP.map(([keys, effect]) => (
        <Text key={keys} wrap="truncate">
          <Text color={FOCUS_COLOR}>{keys.padEnd(16)}</Text>
          <Text dimColor>{effect}</Text>
        </Text>
      ))}
    </Box>
  );
}

function StatusLine({
  session,
  widgets,
  above,
  below,
}: {
  readonly session?: SessionStatus;
  readonly widgets: number;
  readonly above: boolean;
  readonly below: boolean;
}) {
  const scroll =
    above && below
      ? '↕ more above and below'
      : above
        ? '↑ more above'
        : below
          ? '↓ more below'
          : '';
  return (
    <Box flexShrink={0} height={1}>
      <Text wrap="truncate">
        {session && (
          <>
            <Text dimColor>session </Text>
            <Text bold>{session.sessionId}</Text>
            <Text dimColor> · </Text>
          </>
        )}
        <Text dimColor>{`${widgets} ${widgets === 1 ? 'widget' : 'widgets'}`}</Text>
        {session && (
          <Text
            dimColor
          >{` · ${session.clients} ${session.clients === 1 ? 'client' : 'clients'}`}</Text>
        )}
        {scroll && <Text color={FOCUS_COLOR}>{` · ${scroll}`}</Text>}
        <Text dimColor> · ? keys · q quit</Text>
      </Text>
    </Box>
  );
}

/** The widgets of the board, updated when widgets are added or removed. */
function useWidgets(board: WidgetBoard): readonly Widget[] {
  const subscribe = useCallback((onChange: () => void) => board.subscribe(onChange), [board]);
  const read = useCallback(() => board.widgets(), [board]);
  return useSyncExternalStore(subscribe, read);
}
