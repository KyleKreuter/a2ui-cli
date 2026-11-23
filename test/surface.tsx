import {
  A2uiRuntime,
  CATALOG_ID,
  PROTOCOL_VERSION,
  type ActionEvent,
} from '../src/a2ui/processor.js';
import { Surface } from '../src/render/Surface.js';
import { renderTty } from './ink.js';

export type Component = Record<string, unknown> & { id: string; component: string };

export function surfaceMessages(
  surfaceId: string,
  components: Component[],
  dataModel?: Record<string, unknown>,
): unknown[] {
  const messages: unknown[] = [
    { version: PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
    { version: PROTOCOL_VERSION, updateComponents: { surfaceId, components } },
  ];
  if (dataModel) {
    messages.push({
      version: PROTOCOL_VERSION,
      updateDataModel: { surfaceId, path: '/', value: structuredClone(dataModel) },
    });
  }
  return messages;
}

/** Renders one surface built from `components` and records its action events. */
export function renderSurface(components: Component[], dataModel?: Record<string, unknown>) {
  const runtime = new A2uiRuntime();
  const events: ActionEvent[] = [];
  runtime.onAction((event) => events.push(event));
  const errors = runtime.apply(surfaceMessages('main', components, dataModel));
  if (errors.length > 0) {
    throw new Error(`invalid test surface: ${JSON.stringify(errors)}`);
  }
  const surface = runtime.surfaces().get('main');
  if (!surface) {
    throw new Error('surface missing');
  }
  const instance = renderTty(<Surface surface={surface} />);
  return { ...instance, runtime, surface, events };
}
