import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { A2uiRuntime, CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { rewriteAdd, rewriteUpdate, snapshotOf, tryMessages } from './apply.js';

const v = PROTOCOL_VERSION;
const create = (surfaceId: string) => ({
  version: v,
  createSurface: { surfaceId, catalogId: CATALOG_ID },
});
const data = (surfaceId: string) => ({
  version: v,
  updateDataModel: { surfaceId, path: '/x', value: 1 },
});

describe('rewriteAdd', () => {
  it('replaces every surface id with the widget id', () => {
    expect(rewriteAdd([create('progress'), data('progress')], 'w1')).toEqual({
      ok: true,
      messages: [create('w1'), data('w1')],
    });
  });

  it.each([
    [[data('x')], 'the input has 0'],
    [[create('a'), create('a')], 'the input has 2'],
  ])('needs exactly one createSurface', (messages, detail) => {
    expect(rewriteAdd(messages, 'w1')).toEqual({
      ok: false,
      error: `add needs exactly one createSurface message, ${detail}`,
    });
  });

  it('rejects deleteSurface', () => {
    const result = rewriteAdd(
      [create('a'), { version: v, deleteSurface: { surfaceId: 'a' } }],
      'w1',
    );
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('not deleteSurface') as unknown,
    });
  });
});

describe('rewriteUpdate', () => {
  it('rejects a value that is not a message', () => {
    expect(rewriteUpdate([42], 'w1')).toEqual({
      ok: false,
      error:
        'update accepts updateComponents and updateDataModel only, not a value that is not an object',
    });
  });
});

describe('snapshotOf', () => {
  it.each(['confirm', 'form', 'hello', 'progress'])(
    'recreates the surface of examples/%s.jsonl',
    (name) => {
      const runtime = new A2uiRuntime();
      const lines = readFileSync(`examples/${name}.jsonl`, 'utf8').trim().split('\n');
      expect(runtime.apply(lines.map((line) => JSON.parse(line) as unknown))).toEqual([]);
      for (const surface of runtime.surfaces().values()) {
        const copy = new A2uiRuntime();
        expect(copy.apply([snapshotOf(surface)])).toEqual([]);
        expect(copy.surfaces().get(surface.id)?.dataModel.get('/')).toEqual(
          surface.dataModel.get('/'),
        );
        expect([...(copy.surfaces().get(surface.id)?.componentsModel.keys ?? [])]).toEqual([
          ...surface.componentsModel.keys,
        ]);
      }
    },
  );
});

describe('tryMessages', () => {
  it('reports errors and leaves the real surface alone', () => {
    const runtime = new A2uiRuntime();
    runtime.apply([create('w1'), data('w1')]);
    const surface = runtime.surfaces().get('w1');
    const errors = tryMessages(
      [
        { version: v, updateDataModel: { surfaceId: 'w1', path: '/x', value: 2 } },
        {
          version: v,
          updateComponents: { surfaceId: 'w1', components: [{ id: 'root', component: 'Text' }] },
        },
      ],
      surface,
    );
    expect(errors).toHaveLength(1);
    expect(surface?.dataModel.get('/x')).toBe(1);
  });
});
