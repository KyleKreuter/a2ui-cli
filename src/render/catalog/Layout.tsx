import { Box, type BoxProps } from 'ink';
import type { InkComponentProps } from './types.js';

const JUSTIFY: Record<string, BoxProps['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  spaceBetween: 'space-between',
  spaceAround: 'space-around',
  spaceEvenly: 'space-evenly',
  stretch: 'flex-start',
};

const ALIGN: Record<string, BoxProps['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

function Container({
  props,
  renderChild,
  direction,
}: InkComponentProps & { readonly direction: 'row' | 'column' }) {
  const children = Array.isArray(props.children) ? (props.children as unknown[]) : [];
  return (
    <Box
      flexDirection={direction}
      columnGap={direction === 'row' ? 1 : 0}
      justifyContent={JUSTIFY[String(props.justify)] ?? 'flex-start'}
      alignItems={ALIGN[String(props.align)] ?? 'stretch'}
    >
      {children.map((child) => renderChild(child))}
    </Box>
  );
}

export function Row(props: InkComponentProps) {
  return <Container {...props} direction="row" />;
}

export function Column(props: InkComponentProps) {
  return <Container {...props} direction="column" />;
}
