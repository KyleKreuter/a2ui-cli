import { Box } from 'ink';
import type { InkComponentProps } from './types.js';

/** A line across the container, drawn as one side of a border so that it follows the width. */
export function Divider({ props }: InkComponentProps) {
  const vertical = props.axis === 'vertical';
  return (
    <Box
      borderStyle="single"
      borderDimColor
      borderTop={!vertical}
      borderBottom={false}
      borderLeft={vertical}
      borderRight={false}
      width={vertical ? undefined : '100%'}
      alignSelf={vertical ? 'stretch' : undefined}
    />
  );
}
