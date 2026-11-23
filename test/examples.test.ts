import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { A2uiRuntime } from '../src/a2ui/processor.js';

const dir = join(import.meta.dirname, '..', 'examples');
const files = readdirSync(dir).filter((file) => file.endsWith('.jsonl'));

describe('examples', () => {
  it('ships the documented examples', () => {
    expect(files.sort()).toEqual(['confirm.jsonl', 'form.jsonl', 'hello.jsonl', 'progress.jsonl']);
  });

  it.each(files)('%s applies without errors', (file) => {
    const runtime = new A2uiRuntime();
    expect(runtime.applyText(readFileSync(join(dir, file), 'utf8'))).toEqual([]);
    expect(runtime.surfaces().size).toBe(1);
  });

  it('progress.jsonl ends with the final step', () => {
    const runtime = new A2uiRuntime();
    runtime.applyText(readFileSync(join(dir, 'progress.jsonl'), 'utf8'));
    const surface = runtime.surfaces().get('build');
    expect(surface?.dataModel.get('/')).toEqual({ step: 'Done', percent: '100%' });
  });
});
