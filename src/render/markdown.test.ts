import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './markdown.js';

describe('parseMarkdown', () => {
  it('keeps plain text as one span', () => {
    expect(parseMarkdown('Hello world')).toEqual([{ text: 'Hello world' }]);
  });

  it('renders a heading bold without its marks', () => {
    expect(parseMarkdown('## Sign up')).toEqual([{ text: 'Sign up', bold: true }]);
    expect(parseMarkdown('###### Small')).toEqual([{ text: 'Small', bold: true }]);
  });

  it('keeps # without a space and seven # as text', () => {
    expect(parseMarkdown('#hashtag')).toEqual([{ text: '#hashtag' }]);
    expect(parseMarkdown('####### Seven')).toEqual([{ text: '####### Seven' }]);
  });

  it('renders list items with a bullet', () => {
    expect(parseMarkdown('- one\n* two\n  - nested')).toEqual([
      { text: '• one\n• two\n  • nested' },
    ]);
  });

  it('renders bold, italic and code without their marks', () => {
    expect(parseMarkdown('Press **Enter** to *send* `now`')).toEqual([
      { text: 'Press ' },
      { text: 'Enter', bold: true },
      { text: ' to ' },
      { text: 'send', italic: true },
      { text: ' ' },
      { text: 'now', code: true },
    ]);
  });

  it('nests bold inside italic', () => {
    expect(parseMarkdown('*a **b** c*')).toEqual([
      { text: 'a ', italic: true },
      { text: 'b', italic: true, bold: true },
      { text: ' c', italic: true },
    ]);
  });

  it('keeps emphasis marks inside code', () => {
    expect(parseMarkdown('`**not bold**`')).toEqual([{ text: '**not bold**', code: true }]);
  });

  it('keeps escaped marks as text', () => {
    expect(parseMarkdown('\\*literal\\* and \\# not a heading')).toEqual([
      { text: '*literal* and # not a heading' },
    ]);
    expect(parseMarkdown('\\# Title')).toEqual([{ text: '# Title' }]);
  });

  it('keeps underscores in identifiers', () => {
    expect(parseMarkdown('Open file_name_here and __init__')).toEqual([
      { text: 'Open file_name_here and __init__' },
    ]);
  });

  it('keeps unmatched and space-flanked marks', () => {
    expect(parseMarkdown('2 * 3 * 4')).toEqual([{ text: '2 * 3 * 4' }]);
    expect(parseMarkdown('a **b')).toEqual([{ text: 'a **b' }]);
    expect(parseMarkdown('a ` b')).toEqual([{ text: 'a ` b' }]);
  });

  it('keeps links as written', () => {
    expect(parseMarkdown('[docs](https://a2ui.org)')).toEqual([
      { text: '[docs](https://a2ui.org)' },
    ]);
  });

  it('styles inline marks inside a heading', () => {
    expect(parseMarkdown('# Delete *3* files?')).toEqual([
      { text: 'Delete ', bold: true },
      { text: '3', bold: true, italic: true },
      { text: ' files?', bold: true },
    ]);
  });
});
