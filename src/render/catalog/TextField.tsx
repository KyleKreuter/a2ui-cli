import { Box, Text, useFocus } from 'ink';
import TextInput from 'ink-text-input';
import { useContext, useEffect, useState } from 'react';
import { TextInputFocusContext } from '../context.js';
import { ERROR_COLOR, FOCUS_COLOR, FOCUS_MARKER } from '../theme.js';
import { enumOf, setterOf, textOf } from '../values.js';
import type { InkComponentProps } from './types.js';

const VARIANTS = ['shortText', 'longText', 'number', 'obscured'] as const;
const MASK = '•';

export function TextField({ node, props }: InkComponentProps) {
  const { isFocused } = useFocus({ autoFocus: true });
  const textInputFocus = useContext(TextInputFocusContext);
  const [edited, setEdited] = useState(false);
  const variant = enumOf(props.variant, VARIANTS, 'shortText');
  const value = textOf(props.value);
  const setValue = setterOf(props.value);

  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }
    textInputFocus.enter(node.instanceId);
    return () => {
      textInputFocus.leave(node.instanceId);
    };
  }, [isFocused, textInputFocus, node.instanceId]);

  const errors = Array.isArray(props.validationErrors) ? props.validationErrors.map(String) : [];
  const mask = variant === 'obscured' ? MASK : undefined;
  const shown = mask ? mask.repeat(value.length) : value;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={FOCUS_COLOR}>{isFocused ? `${FOCUS_MARKER} ` : '  '}</Text>
        <Text color={isFocused ? FOCUS_COLOR : undefined} bold={isFocused}>
          {textOf(props.label)}
        </Text>
      </Box>
      <Box paddingLeft={2}>
        {isFocused && setValue ? (
          <TextInput
            value={value}
            mask={mask}
            onChange={(next) => {
              setEdited(true);
              setValue(variant === 'number' ? next.replace(/[^\d.,+-]/g, '') : next);
            }}
          />
        ) : (
          <Text dimColor={!isFocused}>{shown === '' ? '…' : shown}</Text>
        )}
      </Box>
      {edited &&
        errors.map((message) => (
          <Box key={message} paddingLeft={2}>
            <Text color={ERROR_COLOR}>{message}</Text>
          </Box>
        ))}
    </Box>
  );
}
