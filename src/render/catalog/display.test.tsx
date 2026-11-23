import { describe, expect, it } from 'vitest';
import { plain, settle } from '../../../test/ink.js';
import { renderSurface } from '../../../test/surface.js';

const BOLD = '\u001B[1m';
const DIM = '\u001B[2m';

describe('registry and placeholder', () => {
  it('renders an unsupported component next to a supported sibling', () => {
    const { lastFrame } = renderSurface([
      { id: 'root', component: 'Column', children: ['chart', 'after'] },
      { id: 'chart', component: 'Chart' },
      { id: 'after', component: 'Text', text: 'still here' },
    ]);
    expect(plain(lastFrame())).toMatchInlineSnapshot(`
      "[unsupported: Chart]
      still here"
    `);
  });
});

describe('Text', () => {
  it('renders headings bold', () => {
    const { lastFrame } = renderSurface([
      { id: 'root', component: 'Text', text: 'Sign up', variant: 'h2' },
    ]);
    expect(lastFrame()).toContain(`${BOLD}Sign up`);
  });

  it('renders captions dimmed', () => {
    const { lastFrame } = renderSurface([
      { id: 'root', component: 'Text', text: 'fine print', variant: 'caption' },
    ]);
    expect(lastFrame()).toContain(`${DIM}fine print`);
  });

  it('renders body text without styling', () => {
    const { lastFrame } = renderSurface([{ id: 'root', component: 'Text', text: 'plain' }]);
    expect(lastFrame()).toBe('plain');
  });

  it('shows the bound value and follows data model updates', async () => {
    const { lastFrame, surface } = renderSurface(
      [{ id: 'root', component: 'Text', text: { path: '/status' } }],
      { status: '10%' },
    );
    expect(lastFrame()).toBe('10%');
    surface.dataModel.set('/status', '50%');
    await settle();
    expect(lastFrame()).toBe('50%');
  });
});

describe('Row and Column', () => {
  it('lays out Row children on one line in order', () => {
    const { lastFrame } = renderSurface([
      { id: 'root', component: 'Row', children: ['a', 'b'] },
      { id: 'a', component: 'Text', text: 'a' },
      { id: 'b', component: 'Text', text: 'b' },
    ]);
    expect(lastFrame()).toBe('a b');
  });

  it('lays out Column children top to bottom', () => {
    const { lastFrame } = renderSurface([
      { id: 'root', component: 'Column', children: ['a', 'b'] },
      { id: 'a', component: 'Text', text: 'a' },
      { id: 'b', component: 'Text', text: 'b' },
    ]);
    expect(lastFrame()).toBe('a\nb');
  });

  it('applies justify on a Row', () => {
    const { lastFrame } = renderSurface([
      { id: 'root', component: 'Row', children: ['a', 'b'], justify: 'spaceBetween' },
      { id: 'a', component: 'Text', text: 'a' },
      { id: 'b', component: 'Text', text: 'b' },
    ]);
    expect(lastFrame()).toBe(`a${' '.repeat(98)}b`);
  });

  it('applies align on a Column', () => {
    const { lastFrame } = renderSurface([
      { id: 'root', component: 'Column', children: ['a'], align: 'end' },
      { id: 'a', component: 'Text', text: 'a' },
    ]);
    expect(lastFrame()).toBe(`${' '.repeat(99)}a`);
  });
});

describe('Card', () => {
  it('draws a rounded border around its child', () => {
    const { lastFrame } = renderSurface([
      { id: 'root', component: 'Row', children: ['card'] },
      { id: 'card', component: 'Card', child: 'col' },
      { id: 'col', component: 'Column', children: ['a', 'b'] },
      { id: 'a', component: 'Text', text: 'one' },
      { id: 'b', component: 'Text', text: 'two' },
    ]);
    expect(plain(lastFrame())).toMatchInlineSnapshot(`
      "╭─────╮
      │ one │
      │ two │
      ╰─────╯"
    `);
  });
});

describe('Divider', () => {
  const components = [
    { id: 'root', component: 'Column', children: ['a', 'line', 'b'] },
    { id: 'a', component: 'Text', text: 'a' },
    { id: 'line', component: 'Divider' },
    { id: 'b', component: 'Text', text: 'b' },
  ];

  it('spans the terminal width', () => {
    const { lastFrame } = renderSurface(components);
    expect(plain(lastFrame()).split('\n')[1]).toBe('─'.repeat(100));
  });

  it('is redrawn when the terminal shrinks', async () => {
    const { lastFrame, stdout } = renderSurface(components);
    stdout.resize(60);
    await settle();
    expect(plain(lastFrame()).split('\n')[1]).toBe('─'.repeat(60));
  });
});
