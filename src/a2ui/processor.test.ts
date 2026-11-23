import { describe, expect, it, vi } from 'vitest';
import {
  A2uiRuntime,
  CATALOG_ID,
  PROTOCOL_VERSION,
  type ActionEvent,
  type OutboundMessage,
} from './processor.js';
import { NodeResolver, isComponentNode, peekValue, type ComponentNode } from './webcore.js';

const v = PROTOCOL_VERSION;

function createSurface(surfaceId: string, extra: Record<string, unknown> = {}) {
  return { version: v, createSurface: { surfaceId, catalogId: CATALOG_ID, ...extra } };
}

function updateComponents(surfaceId: string, components: Record<string, unknown>[]) {
  return { version: v, updateComponents: { surfaceId, components } };
}

function updateDataModel(surfaceId: string, path: string, value: unknown) {
  return { version: v, updateDataModel: { surfaceId, path, value } };
}

function setup() {
  const events: ActionEvent[] = [];
  const runtime = new A2uiRuntime();
  runtime.onAction((event) => events.push(event));
  return { runtime, events };
}

function rootOf(runtime: A2uiRuntime, surfaceId: string): ComponentNode {
  const surface = runtime.surfaces().get(surfaceId);
  if (!surface) {
    throw new Error(`no surface ${surfaceId}`);
  }
  const root = peekValue(new NodeResolver(surface).rootNode);
  if (!root) {
    throw new Error('no root node');
  }
  return root;
}

function prop(node: ComponentNode, name: string): unknown {
  return peekValue(node.props)[name];
}

function submitForm(event: Record<string, unknown> = {}) {
  return [
    createSurface('form'),
    updateComponents('form', [
      { id: 'root', component: 'Column', children: ['name', 'submit'] },
      { id: 'name', component: 'TextField', label: 'Name', value: { '@path': '/form/name' } },
      {
        id: 'submit',
        component: 'Button',
        child: 'submitLabel',
        action: {
          event: { name: 'submit', context: { name: { '@path': '/form/name' } }, ...event },
        },
      },
      { id: 'submitLabel', component: 'Text', text: 'Submit' },
    ]),
  ];
}

describe('A2uiRuntime', () => {
  describe('pinned protocol version', () => {
    it('creates a surface for a 1.0 message', () => {
      const { runtime } = setup();
      expect(runtime.apply([createSurface('main')])).toEqual([]);
      expect([...runtime.surfaces().keys()]).toEqual(['main']);
    });

    it('rejects another version, names 1.0, and keeps existing surfaces', () => {
      const { runtime } = setup();
      runtime.apply([createSurface('main')]);
      const errors = runtime.apply([
        { version: 'v0.9', deleteSurface: { surfaceId: 'main' } },
        { createSurface: { surfaceId: 'other', catalogId: CATALOG_ID } },
      ]);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toMatchObject({ code: 'UNSUPPORTED_VERSION', surfaceId: 'main' });
      expect(errors[0]?.message).toBe('Message has "v0.9". a2ui-term supports A2UI 1.0 only.');
      expect(errors[1]?.message).toContain('no version');
      expect([...runtime.surfaces().keys()]).toEqual(['main']);
    });
  });

  describe('message input formats', () => {
    it('applies JSON Lines in order and ignores blank lines', () => {
      const { runtime } = setup();
      const input = [
        JSON.stringify(createSurface('main')),
        '',
        JSON.stringify(updateComponents('main', [{ id: 'root', component: 'Text', text: 'Hi' }])),
        JSON.stringify(updateDataModel('main', '/x', 1)),
      ].join('\n');
      expect(runtime.applyText(input)).toEqual([]);
      expect(prop(rootOf(runtime, 'main'), 'text')).toMatchObject({ value: 'Hi' });
      expect(runtime.surfaces().get('main')?.dataModel.get('/x')).toBe(1);
    });

    it('applies a JSON array in order', () => {
      const { runtime } = setup();
      const input = JSON.stringify([
        createSurface('main'),
        updateComponents('main', [{ id: 'root', component: 'Text', text: 'Hi' }]),
      ]);
      expect(runtime.applyText(input)).toEqual([]);
      expect(prop(rootOf(runtime, 'main'), 'text')).toMatchObject({ value: 'Hi' });
    });

    it('reports a malformed line by number and applies the lines around it', () => {
      const { runtime } = setup();
      const input = [
        JSON.stringify(createSurface('main')),
        '{"version": "1.0", "updateComp',
        JSON.stringify(updateComponents('main', [{ id: 'root', component: 'Text', text: 'Hi' }])),
      ].join('\n');
      const errors = runtime.applyText(input);
      expect(errors).toEqual([
        expect.objectContaining({ code: 'PARSE_ERROR', line: 2 }) as unknown,
      ]);
      expect(errors[0]?.message).toMatch(/^Line 2: /);
      expect(prop(rootOf(runtime, 'main'), 'text')).toMatchObject({ value: 'Hi' });
    });
  });

  describe('invalid messages', () => {
    it('reports a validation error and applies a later valid message', () => {
      const { runtime } = setup();
      const errors = runtime.apply([
        createSurface('main'),
        { version: v, updateComponents: { components: [{ id: 'root', component: 'Text' }] } },
        updateComponents('main', [{ id: 'root', component: 'Text', text: 'Hi' }]),
      ]);
      expect(errors).toEqual([expect.objectContaining({ code: 'VALIDATION_FAILED' }) as unknown]);
      expect(prop(rootOf(runtime, 'main'), 'text')).toMatchObject({ value: 'Hi' });
    });

    it('reports a non-object message', () => {
      const { runtime } = setup();
      expect(runtime.apply([42, null])).toHaveLength(2);
    });
  });

  describe('data model updates', () => {
    it('updates a bound Text in place', () => {
      const { runtime } = setup();
      runtime.apply([
        createSurface('main'),
        updateComponents('main', [{ id: 'root', component: 'Text', text: { '@path': '/status' } }]),
        updateDataModel('main', '/status', '10%'),
      ]);
      const surface = runtime.surfaces().get('main');
      const root = rootOf(runtime, 'main');
      expect(prop(root, 'text')).toMatchObject({ value: '10%' });

      runtime.apply([updateDataModel('main', '/status', '50%')]);
      expect(prop(root, 'text')).toMatchObject({ value: '50%' });
      expect(runtime.surfaces().get('main')).toBe(surface);
    });
  });

  describe('two-way binding', () => {
    it('writes TextField input to the data model', () => {
      const { runtime } = setup();
      runtime.apply(submitForm());
      const column = rootOf(runtime, 'form');
      const children = prop(column, 'children') as unknown[];
      const field = children[0];
      if (!isComponentNode(field)) {
        throw new Error('expected a node');
      }
      const binding = prop(field, 'value') as { set: (value: string) => void };
      binding.set('Ada');
      expect(runtime.surfaces().get('form')?.dataModel.get('/form/name')).toBe('Ada');
    });
  });

  describe('action events', () => {
    function pressSubmit(runtime: A2uiRuntime) {
      const children = prop(rootOf(runtime, 'form'), 'children') as unknown[];
      const button = children[1];
      if (!isComponentNode(button)) {
        throw new Error('expected a node');
      }
      (prop(button, 'action') as () => void)();
    }

    it('emits the resolved context', () => {
      const { runtime, events } = setup();
      runtime.apply([...submitForm(), updateDataModel('form', '/form/name', 'Ada')]);
      pressSubmit(runtime);
      expect(events).toEqual([
        {
          name: 'submit',
          surfaceId: 'form',
          sourceComponentId: 'submit',
          timestamp: expect.any(String) as unknown,
          context: { name: 'Ada' },
        },
      ]);
    });

    it('adds a data model snapshot when the surface has sendDataModel', () => {
      const { runtime, events } = setup();
      runtime.apply([
        createSurface('form', { sendDataModel: true }),
        ...submitForm().slice(1),
        updateDataModel('form', '/form/name', 'Ada'),
      ]);
      pressSubmit(runtime);
      expect(events[0]?.dataModel).toEqual({ form: { name: 'Ada' } });
    });

    it('adds the resolved user message', () => {
      const { runtime, events } = setup();
      runtime.apply(
        submitForm({
          userMessage: { '@call': 'formatString', args: { value: 'Sent ${/form/name}' } },
        }),
      );
      runtime.apply([updateDataModel('form', '/form/name', 'Ada')]);
      pressSubmit(runtime);
      expect(events[0]?.userMessage).toBe('Sent Ada');
    });
  });

  describe('renderer function calls', () => {
    it('reports the response to a call as an outbound message', async () => {
      const { runtime } = setup();
      const outbound: OutboundMessage[] = [];
      runtime.onOutbound((message) => outbound.push(message));
      runtime.apply([createSurface('main')]);
      const errors = runtime.apply([
        {
          version: v,
          callRendererFunction: {
            surfaceId: 'main',
            functionCallId: 'c1',
            callFunction: { '@call': 'required', catalogId: CATALOG_ID, args: { value: 'x' } },
          },
        },
      ]);
      expect(errors).toEqual([]);
      await vi.waitFor(() => {
        expect(outbound).toHaveLength(1);
      });
      expect(outbound[0]).toMatchObject({
        version: '1.0',
        rendererFunctionResponse: {
          functionCallId: 'c1',
          error: { code: 'INVALID_FUNCTION_CALL' },
        },
      });
    });
  });
});
