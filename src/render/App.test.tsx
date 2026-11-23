import { describe, expect, it } from 'vitest';
import { A2uiRuntime } from '../a2ui/processor.js';
import { WidgetBoard } from '../board/registry.js';
import { keys, plain, renderTty, settle } from '../../test/ink.js';
import { surfaceMessages } from '../../test/surface.js';
import { App, EMPTY_STATE } from './App.js';
import { KEY_HELP } from './Board.js';

function renderApp(messages: unknown[] = []) {
  const runtime = new A2uiRuntime();
  const board = new WidgetBoard(runtime);
  expect(board.apply(messages)).toEqual([]);
  const instance = renderTty(<App board={board} />);
  let exited = false;
  void instance.waitUntilExit().then(() => {
    exited = true;
  });
  return { ...instance, runtime, board, hasExited: () => exited };
}

async function press(stdin: { write: (data: string) => void }, ...sequence: string[]) {
  for (const key of sequence) {
    stdin.write(key);
    await settle();
  }
}

const form = surfaceMessages('form', [
  { id: 'root', component: 'Column', children: ['name', 'submit'] },
  { id: 'name', component: 'TextField', label: 'Name', value: { '@path': '/name' } },
  {
    id: 'submit',
    component: 'Button',
    child: 'label',
    action: { event: { name: 'submit', context: { name: { '@path': '/name' } } } },
  },
  { id: 'label', component: 'Text', text: 'Submit' },
]);

describe('App', () => {
  describe('status line', () => {
    it('shows session, widget count and client count while serving', async () => {
      const board = new WidgetBoard(new A2uiRuntime());
      const session = { sessionId: 't', clients: 0 };
      const { lastFrame, rerender } = renderTty(<App board={board} session={session} />);
      expect(plain(lastFrame())).toContain('session t · 0 widgets · 0 clients');
      rerender(<App board={board} session={{ ...session, clients: 1 }} />);
      await settle();
      expect(plain(lastFrame())).toContain('session t · 0 widgets · 1 client · ? keys · q quit');
    });

    it('shows no session outside serve', () => {
      const { lastFrame } = renderApp();
      expect(plain(lastFrame())).not.toContain('session');
    });
  });

  describe('global keys', () => {
    it('shows and hides the key list with ?', async () => {
      const { lastFrame, stdin } = renderApp();
      await press(stdin, '?');
      for (const [key, effect] of KEY_HELP) {
        expect(plain(lastFrame())).toContain(key);
        expect(plain(lastFrame())).toContain(effect);
      }
      await press(stdin, '?');
      expect(plain(lastFrame())).not.toContain(KEY_HELP[0][1]);
    });

    it('quits with q while a Button has focus', async () => {
      const { stdin, hasExited } = renderApp(form);
      await settle();
      await press(stdin, keys.tab, 'q');
      expect(hasExited()).toBe(true);
    });

    it('types q into a focused TextField instead of quitting', async () => {
      const { stdin, hasExited, runtime } = renderApp(form);
      await settle();
      await press(stdin, 'q', '?');
      expect(hasExited()).toBe(false);
      expect(runtime.surfaces().get('form')?.dataModel.get('/name')).toBe('q?');
    });

    it('quits with Esc while no text input has focus', async () => {
      const { stdin, hasExited } = renderApp(form);
      await settle();
      await press(stdin, keys.tab, keys.escape);
      expect(hasExited()).toBe(true);
    });

    it('does not quit with Esc inside a TextField', async () => {
      const { stdin, hasExited } = renderApp(form);
      await settle();
      await press(stdin, keys.escape);
      expect(hasExited()).toBe(false);
    });

    it('quits with Ctrl+C inside a TextField', async () => {
      const { stdin, hasExited } = renderApp(form);
      await settle();
      await press(stdin, keys.ctrlC);
      expect(hasExited()).toBe(true);
    });

    it('quits with q on the empty board', async () => {
      const { stdin, hasExited, lastFrame } = renderApp();
      expect(plain(lastFrame())).toContain(EMPTY_STATE);
      await press(stdin, 'q');
      expect(hasExited()).toBe(true);
    });
  });
});
