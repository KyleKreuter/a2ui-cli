import { Text as InkText } from 'ink';
import { useMemo } from 'react';
import { useTextStyle } from '../context.js';
import { parseMarkdown } from '../markdown.js';
import { CODE_COLOR } from '../theme.js';
import { enumOf, textOf } from '../values.js';
import type { InkComponentProps } from './types.js';

const VARIANTS = ['caption', 'body'] as const;

export function Text({ props }: InkComponentProps) {
  const inherited = useTextStyle();
  const variant = enumOf(props.variant, VARIANTS, 'body');
  const source = textOf(props.text);
  const spans = useMemo(() => parseMarkdown(source), [source]);
  const dimColor = variant === 'caption' || inherited.dimColor === true;
  // Each span carries its full style, because a nested Ink text that ends bold
  // also ends an outer dim (both end with SGR 22). For the same reason, a bold
  // span in dimmed text is not dimmed: Ink's output stage does not re-open dim
  // after a span that is both bold and dim.
  return (
    <InkText>
      {spans.map((span, index) => {
        const bold = span.bold === true || inherited.bold === true;
        return (
          <InkText
            // Spans have no identity besides their position in the parsed text.
            key={index}
            color={span.code ? CODE_COLOR : inherited.color}
            bold={bold}
            italic={span.italic}
            dimColor={dimColor && (inherited.bold === true || !bold)}
          >
            {span.text}
          </InkText>
        );
      })}
    </InkText>
  );
}
