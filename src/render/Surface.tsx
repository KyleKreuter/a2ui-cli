import { useEffect, useMemo } from 'react';
import { NodeResolver, type SurfaceModel } from '../a2ui/webcore.js';
import { NodeView } from './catalog/NodeView.js';
import { useSignal } from './useSignal.js';

/** Renders the component tree of one surface. */
export function Surface({ surface }: { readonly surface: SurfaceModel }) {
  const resolver = useMemo(() => new NodeResolver(surface), [surface]);
  useEffect(
    () => () => {
      resolver.dispose();
    },
    [resolver],
  );
  const root = useSignal(resolver.rootNode);
  return root ? <NodeView node={root} /> : null;
}
