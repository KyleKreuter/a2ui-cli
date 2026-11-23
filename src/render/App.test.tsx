import { describe, expect, it } from 'vitest';
import { A2uiRuntime, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { keys, plain, renderTty, settle } from '../../test/ink.js';
import { surfaceMessages } from '../../test/surface.js';
import { App, EMPTY_STATE } from './App.js';

function textSurface(id: string, text: string) {
  return surfaceMessages(id, [{ id: 'root', component: 'Text', text }]);
}

function deleteSurface(surfaceId: string) {
  return { version: PROTOCOL_VERSION, deleteSurface: { surfaceId } };
}

function renderApp(messages: unknown[] = []) {
  const runtime = new A2uiRuntime();
  expect(runtime.apply(messages)).toEqual([]);
  const instance = renderTty(<App runtime={runtime} />);
  let exited = false;
  void instance.waitUntilExit().then(() => {
    exited = true;
  });
  return { ...instance, runtime, hasExited: () => exited };
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
  describe('empty state', () => {
    it('waits for UI while no surface exists', () => {
      const { lastFrame } = renderApp();
      expect(plain(lastFrame())).toContain(EMPTY_STATE);
    });

    it('shows a surface as soon as it is created', async () => {
      const { lastFrame, runtime } = renderApp();
      runtime.apply(textSurface('main', 'hello'));
      await settle();
      expect(plain(lastFrame())).toContain('hello');
      expect(plain(lastFrame())).not.toContain(EMPTY_STATE);
    });
  });

  describe('multiple surfaces', () => {
    const two = [...textSurface('a', 'surface A'), ...textSurface('b', 'surface B')];

    it('shows a tab bar and switches with Ctrl+Right and Ctrl+Left', async () => {
      const { lastFrame, stdin } = renderApp(two);
      await settle();
      expect(plain(lastFrame())).toMatch(/^ a {3}b$/m);
      expect(plain(lastFrame())).toContain('surface A');

      await press(stdin, keys.ctrlRight);
      expect(plain(lastFrame())).toContain('surface B');

      await press(stdin, keys.ctrlLeft);
      expect(plain(lastFrame())).toContain('surface A');
    });

    it('hides the tab bar for a single surface', () => {
      const { lastFrame } = renderApp(textSurface('a', 'surface A'));
      expect(plain(lastFrame())).not.toContain(' a ');
    });

    it('shows the next surface when the shown one is deleted', async () => {
      const { lastFrame, runtime, stdin } = renderApp([...two, ...textSurface('c', 'surface C')]);
      await settle();
      await press(stdin, keys.ctrlRight);
      expect(plain(lastFrame())).toContain('surface B');

      runtime.apply([deleteSurface('b')]);
      await settle();
      expect(plain(lastFrame())).toContain('surface C');
    });

    it('shows the empty state when the last surface is deleted', async () => {
      const { lastFrame, runtime } = renderApp(textSurface('a', 'surface A'));
      runtime.apply([deleteSurface('a')]);
      await settle();
      expect(plain(lastFrame())).toContain(EMPTY_STATE);
    });
  });

  describe('status line', () => {
    it('shows the last action', async () => {
      const { lastFrame, stdin } = renderApp(form);
      await settle();
      await press(stdin, keys.tab, keys.enter);
      expect(plain(lastFrame())).toContain('last action: submit');
    });
  });

  describe('global keys', () => {
    it('quits with q while a Button has focus', async () => {
      const { stdin, hasExited } = renderApp(form);
      await settle();
      await press(stdin, keys.tab, 'q');
      expect(hasExited()).toBe(true);
    });

    it('types q into a focused TextField instead of quitting', async () => {
      const { stdin, hasExited, runtime } = renderApp(form);
      await settle();
      await press(stdin, 'q');
      expect(hasExited()).toBe(false);
      expect(runtime.surfaces().get('form')?.dataModel.get('/name')).toBe('q');
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

    it('quits with q in the empty state', async () => {
      const { stdin, hasExited } = renderApp();
      await press(stdin, 'q');
      expect(hasExited()).toBe(true);
    });
  });
});
