import { Box } from 'ink';
import type { InkComponentProps } from './types.js';

export function Card({ props, renderChild }: InkComponentProps) {
  return (
    <Box borderStyle="round" flexDirection="column" paddingX={1}>
      {renderChild(props.child)}
    </Box>
  );
}
