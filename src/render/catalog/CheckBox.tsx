import { Box, Text, useFocus, useInput } from 'ink';
import { useRevealOnFocus } from '../reveal.js';
import { FOCUS_COLOR, FOCUS_MARKER } from '../theme.js';
import { setterOf, textOf, valueOf } from '../values.js';
import type { InkComponentProps } from './types.js';

export function CheckBox({ props }: InkComponentProps) {
  const { isFocused } = useFocus({ autoFocus: true });
  const ref = useRevealOnFocus(isFocused);
  const checked = valueOf(props.value) === true;
  const setChecked = setterOf(props.value);

  useInput(
    (input) => {
      if (input === ' ' && setChecked) {
        setChecked(!checked);
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box ref={ref}>
      <Text color={FOCUS_COLOR}>{isFocused ? `${FOCUS_MARKER} ` : '  '}</Text>
      <Text color={isFocused ? FOCUS_COLOR : undefined} bold={isFocused}>
        {checked ? '[x]' : '[ ]'} {textOf(props.label)}
      </Text>
    </Box>
  );
}
