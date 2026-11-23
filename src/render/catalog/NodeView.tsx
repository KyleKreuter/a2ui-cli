import { Box } from 'ink';
import type { ReactNode } from 'react';
import { isComponentNode, type ComponentNode } from '../../a2ui/webcore.js';
import { useSignal } from '../useSignal.js';
import { Placeholder } from './Placeholder.js';
import { registry } from './registry.js';

/** Renders one resolved node and, through it, its children. */
export function NodeView({ node }: { readonly node: ComponentNode }) {
  const props = useSignal(node.props);
  if (node.state === 'pending') {
    return null;
  }
  const Component = node.state === 'resolved' ? registry[node.type] : undefined;
  if (!Component) {
    return <Placeholder type={node.type} />;
  }
  const rendered = <Component node={node} props={props} renderChild={renderChild} />;
  return typeof props.weight === 'number' ? (
    <Box flexGrow={props.weight}>{rendered}</Box>
  ) : (
    rendered
  );
}

export function renderChild(child: unknown): ReactNode {
  return isComponentNode(child) ? <NodeView key={child.instanceId} node={child} /> : null;
}
