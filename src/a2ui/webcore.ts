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
} from '@a2ui/web_core/v1_0';
export type {
  ActionPayload,
  CallAgentFunctionMessage,
  ComponentNode,
  NodeProps,
  RendererErrorMessage,
  RendererFunctionResponseMessage,
  Signal,
} from '@a2ui/web_core/v1_0';
