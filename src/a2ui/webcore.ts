/**
 * The only module that imports `@a2ui/web_core`. Everything else in a2ui-term
 * imports these re-exports, so a change in the pinned package touches one file.
 */
export {
  MessageProcessor,
  NodeResolver,
  ResolvedBinding,
  SurfaceModel,
  WritableBinding,
  basicCatalog,
  effect,
  getValue,
  isComponentNode,
  isWritable,
  peekValue,
  setValue,
  signal,
} from '@a2ui/web_core/v0_9';
export type {
  ActionPayload,
  ComponentNode,
  NodeProps,
  RendererErrorMessage,
  Signal,
} from '@a2ui/web_core/v0_9';
