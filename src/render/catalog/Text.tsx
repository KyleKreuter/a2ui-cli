import { Text as InkText } from 'ink';
import { useTextStyle } from '../context.js';
import { enumOf, textOf } from '../values.js';
import type { InkComponentProps } from './types.js';

const VARIANTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'caption', 'body'] as const;

export function Text({ props }: InkComponentProps) {
  const inherited = useTextStyle();
  const variant = enumOf(props.variant, VARIANTS, 'body');
  const heading = variant.startsWith('h');
  return (
    <InkText
      color={inherited.color}
      bold={heading || inherited.bold}
      dimColor={variant === 'caption' || inherited.dimColor}
    >
      {textOf(props.text)}
    </InkText>
  );
}
