import { A2uiRuntime, type ActionEvent } from '../src/a2ui/processor.js';
import { WidgetBoard, type AddRequest, type RemoveTarget } from '../src/board/registry.js';
import type { Renderer } from '../src/server/server.js';

/**
 * Records applied plain messages and rejects every message with `bad: true`.
 * Widget requests go to a real {@link WidgetBoard}.
 */
export class FakeRenderer implements Renderer {
  readonly applied: unknown[] = [];
  cleared = 0;
  readonly board = new WidgetBoard(new A2uiRuntime());
  private readonly handlers = new Set<(event: ActionEvent) => void>();

  add(request: AddRequest) {
    return this.board.add(request);
  }

  update(widgetId: string, messages: readonly unknown[]) {
    return this.board.update(widgetId, messages);
  }

  remove(target: RemoveTarget) {
    return this.board.remove(target);
  }

  list() {
    return this.board.list();
  }

  apply(messages: readonly unknown[]) {
    this.applied.push(...messages);
    return messages
      .filter((message) => (message as { bad?: boolean }).bad)
      .map(() => ({ message: 'Validation failed: bad message' }));
  }

  clear() {
    this.cleared += 1;
  }

  onAction(handler: (event: ActionEvent) => void) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  press(event: Partial<ActionEvent> = {}) {
    for (const handler of this.handlers) {
      handler({
        name: 'submit',
        surfaceId: 'form',
        sourceComponentId: 'submit',
        timestamp: '2026-11-23T10:00:00.000Z',
        context: { name: 'Ada' },
        ...event,
      });
    }
  }
}
