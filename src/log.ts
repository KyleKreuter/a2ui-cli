import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import envPaths from 'env-paths';

export interface Logger {
  /** Absolute path of the log file. */
  readonly file: string;
  /** Appends one JSON line with a timestamp and the event name. */
  write(event: string, data?: Record<string, unknown>): void;
}

/** Default log file: `a2ui-term.log` in the platform's log directory for a2ui-term. */
export function defaultLogFile(): string {
  return join(envPaths('a2ui-term', { suffix: '' }).log, 'a2ui-term.log');
}

/**
 * Creates a logger that appends JSON lines to a file.
 *
 * The logger never writes to stdout or stderr, because Ink owns the terminal
 * while it renders. A write that fails is dropped.
 */
export function createLogger(file: string = defaultLogFile()): Logger {
  let directoryReady = false;
  return {
    file,
    write(event, data = {}) {
      const line = `${JSON.stringify({ time: new Date().toISOString(), event, ...data })}\n`;
      try {
        if (!directoryReady) {
          mkdirSync(dirname(file), { recursive: true });
          directoryReady = true;
        }
        appendFileSync(file, line);
      } catch {
        // Nowhere to report this without disturbing the terminal UI.
      }
    },
  };
}
