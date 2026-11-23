import type { ReactNode } from 'react';
import type { ComponentNode, NodeProps } from '../../a2ui/webcore.js';

export interface InkComponentProps {
  /** The resolved node. */
  readonly node: ComponentNode;
  /** The node's current props. Bindings are resolved, child references are nodes. */
  readonly props: NodeProps;
  /** Renders a child node, or nothing if `child` is not a node. */
  readonly renderChild: (child: unknown) => ReactNode;
}

/** Ink implementation of one catalog component. */
export type InkComponent = (props: InkComponentProps) => ReactNode;
