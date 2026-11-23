import { describe, expect, it } from 'vitest';
import { A2uiRuntime, CATALOG_ID, PROTOCOL_VERSION, type ActionEvent } from '../a2ui/processor.js';
import { GRID_COLUMNS, WidgetBoard } from './registry.js';

const v = PROTOCOL_VERSION;

function createSurface(surfaceId: string, extra: Record<string, unknown> = {}) {
  return { version: v, createSurface: { surfaceId, catalogId: CATALOG_ID, ...extra } };
}

function updateComponents(surfaceId: string, components: Record<string, unknown>[]) {
  return { version: v, updateComponents: { surfaceId, components } };
}

function updateDataModel(surfaceId: string, path: string, value?: unknown) {
  return {
    version: v,
    updateDataModel: { surfaceId, path, ...(value === undefined ? {} : { value }) },
  };
}

const text = (surfaceId: string, value: unknown) =>
  updateComponents(surfaceId, [{ id: 'root', component: 'Text', text: value }]);

function setup() {
  const runtime = new A2uiRuntime();
  const board = new WidgetBoard(runtime);
  return { runtime, board };
}

function addText(board: WidgetBoard, extra: Partial<Parameters<WidgetBoard['add']>[0]> = {}) {
  const result = board.add({
    messages: [createSurface('progress'), text('progress', 'x')],
    ...extra,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

const ids = (board: WidgetBoard) => board.widgets().map(({ id }) => id);

describe('WidgetBoard', () => {
  describe('widget ids', () => {
    it('counts up from w1 and uses the widget id as surface id', () => {
      const { runtime, board } = setup();
      expect(addText(board)).toBe('w1');
      expect(addText(board)).toBe('w2');
      expect([...runtime.surfaces().keys()]).toEqual(['w1', 'w2']);
    });

    it('never reuses a removed id', () => {
      const { board } = setup();
      addText(board);
      addText(board);
      board.remove({ widgetIds: ['w2'] });
      expect(addText(board)).toBe('w3');
      board.clear();
      expect(addText(board)).toBe('w4');
    });

    it('reports the widget id as surface id of an action', () => {
      const { runtime, board } = setup();
      const events: ActionEvent[] = [];
      board.onAction((event) => events.push(event));
      const id = addText(board);
      const surface = runtime.surfaces().get(id);
      void surface?.dispatchAction({ event: { name: 'ok' } }, 'root');
      expect(events[0]?.surfaceId).toBe('w1');
    });
  });

  describe('add', () => {
    it('records width, title, label and owner', () => {
      const { board } = setup();
      addText(board, { width: 4, title: 'Build', label: 'api-agent', owner: 'tmux:%3' });
      addText(board);
      expect(board.list()).toEqual([
        {
          widgetId: 'w1',
          title: 'Build',
          label: 'api-agent',
          owner: 'tmux:%3',
          width: 4,
          position: 0,
        },
        { widgetId: 'w2', title: null, label: null, owner: null, width: 6, position: 1 },
      ]);
    });

    it('needs exactly one createSurface', () => {
      const { runtime, board } = setup();
      const result = board.add({ messages: [updateDataModel('x', '/a', 1)] });
      expect(result).toEqual({
        ok: false,
        error: expect.stringContaining('exactly one createSurface') as unknown,
      });
      expect(runtime.surfaces().size).toBe(0);
    });

    it('creates nothing when the second message fails', () => {
      const { runtime, board } = setup();
      const result = board.add({
        messages: [
          createSurface('progress'),
          updateComponents('progress', [{ id: 'root', component: 'Text' }]),
        ],
      });
      expect(result.ok).toBe(false);
      expect(runtime.surfaces().size).toBe(0);
      expect(addText(board)).toBe('w1');
    });

    it('rejects messages for more than one surface', () => {
      const { board } = setup();
      const result = board.add({ messages: [createSurface('a'), text('b', 'x')] });
      expect(result).toEqual({
        ok: false,
        error: expect.stringContaining('one surface') as unknown,
      });
    });

    it.each([0, 13, 2.5])('rejects the width %d', (width) => {
      const { board } = setup();
      expect(board.add({ messages: [createSurface('a')], width }).ok).toBe(false);
    });
  });

  describe('update', () => {
    it('applies components and data and keeps the order', () => {
      const { runtime, board } = setup();
      addText(board);
      addText(board);
      addText(board);
      const result = board.update('w1', [
        updateComponents('ignored', [{ id: 'root', component: 'Text', text: { path: '/step' } }]),
        updateDataModel('ignored', '/step', 'Compiling'),
      ]);
      expect(result).toEqual({ ok: true, value: undefined });
      expect(runtime.surfaces().get('w1')?.dataModel.get('/step')).toBe('Compiling');
      expect(ids(board)).toEqual(['w1', 'w2', 'w3']);
    });

    it('deletes a value for updateDataModel without value', () => {
      const { runtime, board } = setup();
      addText(board);
      board.update('w1', [updateDataModel('w1', '/step', 'x')]);
      expect(board.update('w1', [updateDataModel('w1', '/step')]).ok).toBe(true);
      expect(runtime.surfaces().get('w1')?.dataModel.get('/')).toEqual({});
    });

    it('applies nothing when a later message fails', () => {
      const { runtime, board } = setup();
      addText(board);
      const result = board.update('w1', [
        updateDataModel('w1', '/step', 'changed'),
        updateComponents('w1', [{ id: 'root', component: 'Text' }]),
      ]);
      expect(result.ok).toBe(false);
      expect(runtime.surfaces().get('w1')?.dataModel.get('/step')).toBeUndefined();
    });

    it('checks the update against the current components', () => {
      const { board } = setup();
      board.add({
        messages: [
          createSurface('form'),
          updateComponents('form', [
            { id: 'root', component: 'Column', children: ['label'] },
            { id: 'label', component: 'Text', text: 'Name' },
          ]),
        ],
      });
      expect(
        board.update('w1', [
          updateComponents('w1', [{ id: 'label', component: 'Text', text: 'New' }]),
        ]),
      ).toEqual({ ok: true, value: undefined });
    });

    it.each([
      ['createSurface', createSurface('w1')],
      ['deleteSurface', { version: v, deleteSurface: { surfaceId: 'w1' } }],
    ])('rejects %s', (kind, message) => {
      const { runtime, board } = setup();
      addText(board);
      expect(board.update('w1', [message])).toEqual({
        ok: false,
        error: `update accepts updateComponents and updateDataModel only, not ${kind}`,
      });
      expect(runtime.surfaces().has('w1')).toBe(true);
    });

    it('names an unknown widget', () => {
      const { board } = setup();
      expect(board.update('w9', [])).toEqual({ ok: false, error: 'widget w9 does not exist' });
    });
  });

  describe('remove', () => {
    it('removes the widgets of one owner in board order', () => {
      const { board } = setup();
      addText(board, { owner: 'tmux:%3' });
      addText(board, { owner: 'tmux:%5' });
      addText(board);
      addText(board, { owner: 'tmux:%3' });
      expect(board.remove({ owner: 'tmux:%3' })).toEqual({ ok: true, value: ['w1', 'w4'] });
      expect(ids(board)).toEqual(['w2', 'w3']);
    });

    it('removes nothing when one id does not exist', () => {
      const { board } = setup();
      addText(board);
      expect(board.remove({ widgetIds: ['w1', 'w2'] })).toEqual({
        ok: false,
        error: 'widget w2 does not exist',
      });
      expect(ids(board)).toEqual(['w1']);
    });
  });

  describe('plain surfaces', () => {
    it('become full-width widgets without owner', () => {
      const { board } = setup();
      addText(board);
      expect(board.apply([createSurface('confirm')])).toEqual([]);
      expect(board.list()[1]).toEqual({
        widgetId: 'confirm',
        title: null,
        label: null,
        owner: null,
        width: GRID_COLUMNS,
        position: 1,
      });
    });

    it('cannot use a reserved id', () => {
      const { runtime, board } = setup();
      expect(board.apply([createSurface('w9')])).toEqual([
        { message: expect.stringContaining('w9 is reserved') as unknown },
      ]);
      expect(runtime.surfaces().size).toBe(0);
    });

    it('leave the board when deleted', () => {
      const { board } = setup();
      board.apply([createSurface('confirm')]);
      board.apply([{ version: v, deleteSurface: { surfaceId: 'confirm' } }]);
      expect(board.widgets()).toEqual([]);
    });
  });

  it('tells subscribers about added and removed widgets', () => {
    const { board } = setup();
    let calls = 0;
    board.subscribe(() => (calls += 1));
    const before = board.widgets();
    addText(board);
    expect(calls).toBe(1);
    expect(board.widgets()).not.toBe(before);
    board.update('w1', [updateDataModel('w1', '/x', 1)]);
    expect(calls).toBe(1);
    board.remove({ widgetIds: ['w1'] });
    expect(calls).toBe(2);
  });
});
