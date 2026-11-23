import { describe, expect, it } from 'vitest';
import { A2uiRuntime, CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { WidgetBoard, type AddRequest } from '../board/registry.js';
import { keys, plain, renderTty, settle } from '../../test/ink.js';
import { App } from './App.js';
import { EMPTY_STATE, frameCaption, widgetWidth } from './Board.js';

const v = PROTOCOL_VERSION;

type Component = Record<string, unknown> & { id: string; component: string };

function messages(surfaceId: string, components: Component[]): unknown[] {
  return [
    { version: v, createSurface: { surfaceId, catalogId: CATALOG_ID } },
    { version: v, updateComponents: { surfaceId, components } },
  ];
}

function widget(components: Component[], extra: Omit<AddRequest, 'messages'> = {}): AddRequest {
  return { messages: messages('s', components), ...extra };
}

const text = (value: string, extra: Omit<AddRequest, 'messages'> = {}) =>
  widget([{ id: 'root', component: 'Text', text: value }], extra);

/** A full-width widget with `count` text rows, so its frame is `count + 2` rows high. */
function lines(count: number, prefix = 'line') {
  const ids = Array.from({ length: count }, (_, index) => `t${index + 1}`);
  return widget(
    [
      { id: 'root', component: 'Column', children: ids },
      ...ids.map((id, index) => ({ id, component: 'Text', text: `${prefix} ${index + 1}` })),
    ],
    { width: 12 },
  );
}

function button(label: string): AddRequest {
  return widget(
    [
      { id: 'root', component: 'Button', child: 'label', action: { event: { name: label } } },
      { id: 'label', component: 'Text', text: label },
    ],
    { width: 12 },
  );
}

function renderBoard(requests: AddRequest[], columns = 100, rows = 40) {
  const runtime = new A2uiRuntime();
  const board = new WidgetBoard(runtime);
  for (const request of requests) {
    const result = board.add(request);
    if (!result.ok) {
      throw new Error(result.error);
    }
  }
  const instance = renderTty(<App board={board} />, columns, rows);
  const screen = () => plain(instance.lastFrame()).split('\n');
  return { ...instance, board, screen };
}

async function press(stdin: { write: (data: string) => void }, ...sequence: string[]) {
  for (const key of sequence) {
    stdin.write(key);
    await settle();
  }
}

/** The row on screen whose top border names `widgetId`. */
const topRow = (screen: string[], widgetId: string) =>
  screen.findIndex((line) => line.includes('╭') && line.includes(` ${widgetId} `));

describe('Board', () => {
  it('shows the add hint while it has no widgets', () => {
    const { screen } = renderBoard([]);
    expect(screen()[0]).toBe(EMPTY_STATE);
    expect(EMPTY_STATE).toContain('a2ui-term add');
  });

  it('shows all widgets at the same time', async () => {
    const { screen } = renderBoard([text('progress 40%'), text('chart')]);
    await settle();
    expect(screen().join('\n')).toContain('progress 40%');
    expect(screen().join('\n')).toContain('chart');
  });

  describe('grid', () => {
    it('puts two half-width widgets into one row at 120 columns', async () => {
      const { screen } = renderBoard([text('a'), text('b')], 120);
      await settle();
      const row = topRow(screen(), 'w1');
      expect(row).toBe(topRow(screen(), 'w2'));
      expect(screen()[row]).toHaveLength(120);
    });

    it('gives each widget its own full-width row below 80 columns', async () => {
      const { screen } = renderBoard([text('a'), text('b')], 60);
      await settle();
      expect(topRow(screen(), 'w2')).toBeGreaterThan(topRow(screen(), 'w1'));
      expect(screen()[topRow(screen(), 'w1')]).toHaveLength(60);
    });

    it('starts a new row when the next widget does not fit', async () => {
      const { screen } = renderBoard(
        [text('a', { width: 8 }), text('b', { width: 8 }), text('c', { width: 4 })],
        120,
      );
      await settle();
      expect(topRow(screen(), 'w2')).toBeGreaterThan(topRow(screen(), 'w1'));
      expect(topRow(screen(), 'w3')).toBe(topRow(screen(), 'w2'));
    });

    it('makes each widget as high as its content', async () => {
      const { screen } = renderBoard([lines(3), text('next')], 100);
      await settle();
      expect(topRow(screen(), 'w2')).toBe(5);
    });

    it.each([
      [6, 120, 60],
      [4, 100, 33],
      [12, 100, 100],
      [6, 79, 79],
    ])('makes width %d %d columns wide at %d columns', (grid, terminal, expected) => {
      expect(widgetWidth(grid, terminal)).toBe(expected);
    });
  });

  describe('frame', () => {
    it('shows title, label and widget id in the top border line', async () => {
      const { screen } = renderBoard([text('x', { title: 'Build', label: 'api-agent' })]);
      await settle();
      expect(screen()[0]).toMatch(/^╭─ Build · api-agent · w1 ─+╮$/);
      expect(screen()[2]).toMatch(/^╰─+╯$/);
    });

    it('shows the surface id of a plain surface at full width', async () => {
      const runtime = new A2uiRuntime();
      const board = new WidgetBoard(runtime);
      board.apply(messages('confirm', [{ id: 'root', component: 'Text', text: 'Confirm me' }]));
      const { lastFrame } = renderTty(<App board={board} />, 100);
      await settle();
      expect(plain(lastFrame()).split('\n')[0]).toMatch(/^╭─ confirm ─+╮$/);
      expect(plain(lastFrame()).split('\n')[0]).toHaveLength(100);
    });

    it('cuts a long caption to the frame width', async () => {
      const { screen } = renderBoard([text('x', { title: 'T'.repeat(200), width: 12 })], 100);
      await settle();
      expect(screen()[0]).toHaveLength(100);
      expect(screen()[0]).toContain('…');
    });

    it('builds the caption from the set parts only', () => {
      expect(frameCaption({ id: 'w3' })).toBe('w3');
      expect(frameCaption({ id: 'w3', label: 'tmux:%3' })).toBe('tmux:%3 · w3');
    });
  });

  describe('scrolling', () => {
    it('shows the last row above the status line after End', async () => {
      // 118 text rows and two border rows: 120 rows in a 40-row terminal.
      const { screen, stdin } = renderBoard([lines(118)], 100, 40);
      await settle();
      expect(screen()).toHaveLength(40);
      expect(screen()[39]).toContain('↓ more below');
      await press(stdin, keys.end);
      expect(screen()).toHaveLength(40);
      expect(screen()[38]).toMatch(/^╰─+╯$/);
      expect(screen()[37]).toContain('line 118');
      expect(screen()[0]).toContain('line 81');
      expect(screen()[39]).toContain('↑ more above');
    });

    it('scrolls by page, by line and back to the top', async () => {
      const { screen, stdin } = renderBoard([lines(118)], 100, 40);
      await settle();
      await press(stdin, keys.pageDown);
      expect(screen()[0]).toContain('line 39');
      await press(stdin, keys.down, keys.down);
      expect(screen()[0]).toContain('line 41');
      await press(stdin, keys.up);
      expect(screen()[0]).toContain('line 40');
      await press(stdin, keys.pageUp);
      expect(screen()[0]).toContain('line 1');
      await press(stdin, keys.end, keys.home);
      expect(screen()[0]).toMatch(/^╭─ w1 /);
      expect(screen()[39]).toContain('↓ more below');
    });

    it('keeps the offset when a widget below the view changes', async () => {
      const { screen, stdin, board } = renderBoard([lines(118), text('old')], 100, 40);
      await settle();
      await press(stdin, keys.down, keys.down, keys.down);
      const before = screen()[0];
      expect(before).toContain('line 3');
      board.update('w2', [
        {
          version: v,
          updateComponents: {
            surfaceId: 'w2',
            components: [{ id: 'root', component: 'Text', text: 'new\nand\nlonger' }],
          },
        },
      ]);
      await settle();
      expect(screen()[0]).toBe(before);
    });

    it('moves the offset back when the content gets shorter than the view', async () => {
      const { screen, stdin, board } = renderBoard([lines(118), lines(10, 'extra')], 100, 40);
      await settle();
      await press(stdin, keys.end);
      board.remove({ widgetIds: ['w2'] });
      await settle();
      expect(screen()[38]).toMatch(/^╰─+╯$/);
      expect(screen()[37]).toContain('line 118');
    });

    it('does not scroll past the end', async () => {
      const { screen, stdin } = renderBoard([lines(118)], 100, 40);
      await settle();
      await press(stdin, keys.end, keys.down, keys.pageDown);
      expect(screen()[37]).toContain('line 118');
      await press(stdin, keys.up);
      expect(screen()[38]).toContain('line 118');
    });

    it('scrolls the focused component into view on Tab', async () => {
      const { screen, stdin } = renderBoard([button('top'), lines(60), button('bottom')], 100, 40);
      await settle();
      expect(screen().join('\n')).toContain('› [ top ]');
      await press(stdin, keys.tab);
      expect(screen().join('\n')).toContain('› [ bottom ]');
      await press(stdin, keys.shiftTab);
      expect(screen().join('\n')).toContain('› [ top ]');
    });

    it('shows no scroll hint when everything fits', async () => {
      const { screen } = renderBoard([text('a')], 100, 40);
      await settle();
      expect(screen()[39]).not.toContain('more');
    });
  });
});
