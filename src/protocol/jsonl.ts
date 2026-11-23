/** A line of input that is not valid JSON. Line numbers start at 1. */
export interface ParseError {
  readonly line: number;
  readonly message: string;
}

export interface ParseResult {
  readonly messages: unknown[];
  readonly errors: ParseError[];
}

/**
 * Parses A2UI messages from JSON Lines or from a single JSON array.
 *
 * Blank lines are ignored. A malformed line produces a {@link ParseError} and
 * does not stop the lines around it from being parsed. A line that holds a JSON
 * array contributes each of its elements.
 */
export function parseMessages(input: string): ParseResult {
  const whole = parseWholeArray(input);
  if (whole) {
    return { messages: whole, errors: [] };
  }

  const messages: unknown[] = [];
  const errors: ParseError[] = [];
  const lines = input.split(/\r?\n/);
  lines.forEach((text, index) => {
    if (text.trim() === '') {
      return;
    }
    try {
      const value: unknown = JSON.parse(text);
      if (Array.isArray(value)) {
        messages.push(...(value as unknown[]));
      } else {
        messages.push(value);
      }
    } catch (error) {
      errors.push({ line: index + 1, message: errorMessage(error) });
    }
  });
  return { messages, errors };
}

/** Serializes one message as a JSON Lines record, including the newline. */
export function toJsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function parseWholeArray(input: string): unknown[] | undefined {
  if (!input.trimStart().startsWith('[')) {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(input);
    return Array.isArray(value) ? (value as unknown[]) : undefined;
  } catch {
    return undefined;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
