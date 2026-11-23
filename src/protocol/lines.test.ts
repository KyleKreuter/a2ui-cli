import { describe, expect, it } from 'vitest';
import { LineTooLongError, createLineSplitter } from './lines.js';

function collect(maxBytes?: number) {
  const lines: string[] = [];
  const splitter = createLineSplitter((line) => lines.push(line), maxBytes);
  return { lines, splitter };
}

describe('createLineSplitter', () => {
  it('handles two lines in one write in order', () => {
    const { lines, splitter } = collect();
    splitter.push('{"a":1}\n{"b":2}\n');
    expect(lines).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('emits a line split across writes after the second part', () => {
    const { lines, splitter } = collect();
    splitter.push('{"type":');
    expect(lines).toEqual([]);
    splitter.push('"ping"}\n');
    expect(lines).toEqual(['{"type":"ping"}']);
  });

  it('keeps a multi-byte character split across writes', () => {
    const { lines, splitter } = collect();
    const bytes = Buffer.from('Grüße\n');
    splitter.push(bytes.subarray(0, 3));
    splitter.push(bytes.subarray(3));
    expect(lines).toEqual(['Grüße']);
  });

  it('drops a trailing carriage return', () => {
    const { lines, splitter } = collect();
    splitter.push('x\r\n');
    expect(lines).toEqual(['x']);
  });

  it('accepts a line at the limit', () => {
    const { lines, splitter } = collect(4);
    splitter.push('abcd\n');
    expect(lines).toEqual(['abcd']);
  });

  it('throws for a line above the limit without a newline', () => {
    const { splitter } = collect(4);
    splitter.push('abc');
    expect(() => {
      splitter.push('de');
    }).toThrow(LineTooLongError);
  });

  it('throws for a complete line above the limit', () => {
    const { lines, splitter } = collect(4);
    expect(() => {
      splitter.push('ok\nabcde\n');
    }).toThrow(LineTooLongError);
    expect(lines).toEqual(['ok']);
  });

  it('throws for 5 MiB without a newline at the default limit', () => {
    const { splitter } = collect();
    const mebibyte = Buffer.alloc(1024 * 1024, 0x61);
    expect(() => {
      for (let i = 0; i < 5; i += 1) {
        splitter.push(mebibyte);
      }
    }).toThrow('Line exceeds 4194304 bytes');
  });
});
