import { Box, Text, useFocus, useInput } from 'ink';
import { TextStyleContext, type TextStyle } from '../context.js';
import { FOCUS_COLOR, FOCUS_MARKER } from '../theme.js';
import { enumOf } from '../values.js';
import type { InkComponentProps } from './types.js';

const VARIANTS = ['default', 'primary', 'borderless'] as const;

export function Button({ props, renderChild }: InkComponentProps) {
  const { isFocused } = useFocus({ autoFocus: true });
  const variant = enumOf(props.variant, VARIANTS, 'default');
  const enabled = props.isValid !== false;
  const action = typeof props.action === 'function' ? (props.action as () => unknown) : undefined;

  useInput(
    (input, key) => {
      if (enabled && action && (key.return || input === ' ')) {
        void action();
      }
    },
    { isActive: isFocused },
  );

  const style: TextStyle = {
    color: isFocused ? FOCUS_COLOR : undefined,
    bold: isFocused || variant === 'primary',
    dimColor: !enabled,
  };
  const brackets = variant !== 'borderless';
  return (
    <Box>
      <Text color={FOCUS_COLOR}>{isFocused ? `${FOCUS_MARKER} ` : '  '}</Text>
      <TextStyleContext value={style}>
        {brackets && <Text {...style}>[ </Text>}
        {renderChild(props.child)}
        {brackets && <Text {...style}> ]</Text>}
      </TextStyleContext>
    </Box>
  );
}
