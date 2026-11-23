import { describe, expect, it } from 'vitest';
import { parseClientLine, parseServerLine } from './messages.js';

describe('parseClientLine', () => {
  it.each([
    [{ type: 'a2ui', message: { version: '1.0' } }],
    [{ type: 'clear' }],
    [{ type: 'focus' }],
    [{ type: 'close' }],
    [{ type: 'ping', id: 'abc' }],
  ])('accepts %j', (message) => {
    expect(parseClientLine(JSON.stringify(message))).toEqual({ ok: true, message });
  });

  it('drops unknown fields', () => {
    expect(parseClientLine('{"type":"ping","id":"a","extra":1}')).toEqual({
      ok: true,
      message: { type: 'ping', id: 'a' },
    });
  });

  it('reports invalid JSON with source parse', () => {
    expect(parseClientLine('{not json')).toMatchObject({ ok: false, source: 'parse' });
  });

  it('reports an unknown type with source protocol', () => {
    expect(parseClientLine('{"type":"dance"}')).toEqual({
      ok: false,
      source: 'protocol',
      error: 'Unknown message type "dance"',
    });
  });

  it.each([
    ['{"type":"ping"}', 'Invalid "ping" message: id: '],
    ['{"type":"a2ui"}', 'Invalid "a2ui" message: message: Expected an A2UI message'],
    ['{"kind":"ping"}', 'Expected an object with a string field "type"'],
    ['[{"type":"ping","id":"a"}]', 'Expected an object with a string field "type"'],
  ])('reports the invalid message %s', (line, error) => {
    const result = parseClientLine(line);
    expect(result).toMatchObject({ ok: false, source: 'protocol' });
    expect(result.ok ? '' : result.error).toContain(error);
  });

  it('rejects server messages', () => {
    expect(parseClientLine('{"type":"pong","id":"a"}')).toMatchObject({ ok: false });
  });
});

describe('parseServerLine', () => {
  it.each([
    [{ type: 'ready', version: '0.1.0', a2uiSpec: '1.0' }],
    [{ type: 'pong', id: 'abc' }],
    [
      {
        type: 'action',
        surfaceId: 'form',
        name: 'submit',
        sourceComponentId: 'submit',
        timestamp: '2026-11-23T10:00:00.000Z',
        context: { name: 'Ada' },
      },
    ],
    [
      {
        type: 'action',
        surfaceId: 'form',
        name: 'submit',
        sourceComponentId: 'submit',
        timestamp: '2026-11-23T10:00:00.000Z',
        context: {},
        userMessage: 'Sent',
        dataModel: { name: 'Ada' },
      },
    ],
    [{ type: 'error', message: 'bad', source: 'render' }],
    [{ type: 'closed', reason: 'user' }],
  ])('accepts %j', (message) => {
    expect(parseServerLine(JSON.stringify(message))).toEqual({ ok: true, message });
  });

  it('rejects an unknown error source and close reason', () => {
    expect(parseServerLine('{"type":"error","message":"x","source":"disk"}')).toMatchObject({
      ok: false,
    });
    expect(parseServerLine('{"type":"closed","reason":"bored"}')).toMatchObject({ ok: false });
  });
});
