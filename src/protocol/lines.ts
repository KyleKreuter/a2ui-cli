/** Longest line, in bytes, that the socket protocol accepts. */
export const MAX_LINE_BYTES = 4 * 1024 * 1024;

const NEWLINE = 0x0a;

/** A line that grew beyond the limit before its newline arrived. */
export class LineTooLongError extends Error {
  constructor(readonly limit: number) {
    super(`Line exceeds ${limit} bytes`);
    this.name = 'LineTooLongError';
  }
}

export interface LineSplitter {
  /**
   * Adds bytes from the stream and calls `onLine` for every complete line.
   * Throws {@link LineTooLongError} when the current line exceeds the limit.
   */
  push(chunk: Buffer | string): void;
}

/**
 * Splits a byte stream into UTF-8 lines at `\n` and drops a trailing `\r`.
 *
 * The split works on bytes: `\n` never occurs inside a multi-byte UTF-8
 * sequence, so a character split across chunks stays intact.
 */
export function createLineSplitter(
  onLine: (line: string) => void,
  maxBytes: number = MAX_LINE_BYTES,
): LineSplitter {
  let pending: Buffer[] = [];
  let pendingBytes = 0;
  let failed = false;

  return {
    push(chunk) {
      if (failed) {
        return;
      }
      const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      let start = 0;
      let end = bytes.indexOf(NEWLINE, start);
      while (end !== -1) {
        const part = bytes.subarray(start, end);
        if (pendingBytes + part.length > maxBytes) {
          failed = true;
          throw new LineTooLongError(maxBytes);
        }
        const line = Buffer.concat([...pending, part]).toString('utf8');
        pending = [];
        pendingBytes = 0;
        onLine(line.endsWith('\r') ? line.slice(0, -1) : line);
        start = end + 1;
        end = bytes.indexOf(NEWLINE, start);
      }
      const rest = bytes.subarray(start);
      if (pendingBytes + rest.length > maxBytes) {
        failed = true;
        throw new LineTooLongError(maxBytes);
      }
      if (rest.length > 0) {
        pending.push(Buffer.from(rest));
        pendingBytes += rest.length;
      }
    },
  };
}
