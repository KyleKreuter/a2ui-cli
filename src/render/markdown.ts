/**
 * Parses the Markdown subset that a2ui-term renders in Text components:
 * headings, list items, `**bold**`, `*italic*` and `` `code` ``. All other
 * text, including links, images and HTML, stays as written.
 */

/** A run of text with one style. */
export interface Span {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly code?: boolean;
}

interface Style {
  readonly bold?: boolean;
  readonly italic?: boolean;
}

const HEADING = /^#{1,6}[ \t]+(.*)$/;
const LIST_ITEM = /^([ \t]*)[-*][ \t]+(.*)$/;
const ESCAPABLE = new Set(['\\', '*', '`', '#', '-', '_']);
const BULLET = '•';

/** Splits `source` into styled spans. Line breaks stay in the span text. */
export function parseMarkdown(source: string): Span[] {
  const spans: Span[] = [];
  source.split('\n').forEach((line, index) => {
    if (index > 0) {
      spans.push({ text: '\n' });
    }
    spans.push(...parseLine(line));
  });
  return merge(spans);
}

function parseLine(line: string): Span[] {
  const heading = HEADING.exec(line);
  if (heading) {
    return parseInline(heading[1] ?? '', { bold: true });
  }
  const item = LIST_ITEM.exec(line);
  if (item) {
    return [{ text: `${item[1] ?? ''}${BULLET} ` }, ...parseInline(item[2] ?? '', {})];
  }
  return parseInline(line, {});
}

function parseInline(text: string, style: Style): Span[] {
  const spans: Span[] = [];
  let plain = '';
  const flush = () => {
    if (plain !== '') {
      spans.push({ text: plain, ...style });
      plain = '';
    }
  };

  let i = 0;
  while (i < text.length) {
    const char = text.charAt(i);
    const next = text.charAt(i + 1);

    if (char === '\\' && ESCAPABLE.has(next)) {
      plain += next;
      i += 2;
      continue;
    }

    if (char === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        spans.push({ text: text.slice(i + 1, end), ...style, code: true });
        i = end + 1;
        continue;
      }
    }

    if (char === '*') {
      const marker = next === '*' ? '**' : '*';
      const end = closingMarker(text, i, marker);
      if (end !== undefined) {
        flush();
        const inner = text.slice(i + marker.length, end);
        const innerStyle = marker === '**' ? { ...style, bold: true } : { ...style, italic: true };
        spans.push(...parseInline(inner, innerStyle));
        i = end + marker.length;
        continue;
      }
    }

    plain += char;
    i += 1;
  }
  flush();
  return spans;
}

/**
 * Returns the index of the marker that closes the one at `start`, or undefined.
 * Like CommonMark, an opening marker must be followed and a closing marker
 * preceded by a non-space character, so `2 * 3 * 4` stays plain text.
 */
function closingMarker(text: string, start: number, marker: string): number | undefined {
  const contentStart = start + marker.length;
  if (isSpace(text.charAt(contentStart))) {
    return undefined;
  }
  let i = contentStart;
  while (i < text.length) {
    const char = text.charAt(i);
    if (char === '\\') {
      i += 2;
      continue;
    }
    if (char === '`') {
      const end = text.indexOf('`', i + 1);
      i = end === -1 ? i + 1 : end + 1;
      continue;
    }
    if (marker === '*' && text.startsWith('**', i)) {
      i = skipBold(text, i);
      continue;
    }
    if (text.startsWith(marker, i) && i > contentStart && !isSpace(text.charAt(i - 1))) {
      return i;
    }
    i += 1;
  }
  return undefined;
}

/** Skips a `**bold**` run inside an italic run, so `*a **b** c*` closes at the last `*`. */
function skipBold(text: string, start: number): number {
  const end = closingMarker(text, start, '**');
  return end === undefined ? start + 2 : end + 2;
}

function isSpace(char: string): boolean {
  return char === '' || /\s/.test(char);
}

function merge(spans: readonly Span[]): Span[] {
  const merged: Span[] = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (last && last.bold === span.bold && last.italic === span.italic && last.code === span.code) {
      merged[merged.length - 1] = { ...last, text: last.text + span.text };
    } else {
      merged.push(span);
    }
  }
  return merged;
}
