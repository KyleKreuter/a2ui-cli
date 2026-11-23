import { describe, expect, it } from 'vitest';
import { parseMessages, toJsonLine } from './jsonl.js';

describe('parseMessages', () => {
  it('parses JSON Lines and ignores blank lines', () => {
    const input = '{"a":1}\n\n{"b":2}\r\n   \n{"c":3}\n';
    expect(parseMessages(input)).toEqual({
      messages: [{ a: 1 }, { b: 2 }, { c: 3 }],
      errors: [],
    });
  });

  it('parses a JSON array that spans several lines', () => {
    const input = '[\n  {"a": 1},\n  {"b": 2}\n]\n';
    expect(parseMessages(input)).toEqual({ messages: [{ a: 1 }, { b: 2 }], errors: [] });
  });

  it('reports a malformed line by number and keeps the other lines', () => {
    const result = parseMessages('{"a":1}\n{"b":\n{"c":3}');
    expect(result.messages).toEqual([{ a: 1 }, { c: 3 }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.line).toBe(2);
  });

  it('flattens a JSON Lines record that holds an array', () => {
    expect(parseMessages('[{"a":1},{"b":2}]\n{"c":3}').messages).toEqual([
      { a: 1 },
      { b: 2 },
      { c: 3 },
    ]);
  });

  it('returns nothing for empty input', () => {
    expect(parseMessages('')).toEqual({ messages: [], errors: [] });
  });
});

describe('toJsonLine', () => {
  it('writes one line per value', () => {
    expect(toJsonLine({ a: 'x\ny' })).toBe('{"a":"x\\ny"}\n');
  });
});
