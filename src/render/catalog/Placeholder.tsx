import { Text } from 'ink';

/** Stands in for a component type that a2ui-term does not render. */
export function Placeholder({ type }: { readonly type: string }) {
  return <Text dimColor>[unsupported: {type}]</Text>;
}
