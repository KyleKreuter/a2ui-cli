import type { ActionEvent } from '../src/a2ui/processor.js';
import type { Renderer } from '../src/server/server.js';

/** Records applied messages; rejects every message with `bad: true`. */
export class FakeRenderer implements Renderer {
  readonly applied: unknown[] = [];
  cleared = 0;
  private readonly handlers = new Set<(event: ActionEvent) => void>();

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
