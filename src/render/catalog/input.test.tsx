import { describe, expect, it } from 'vitest';
import { keys, plain, settle } from '../../../test/ink.js';
import { renderSurface, type Component } from '../../../test/surface.js';

const form: Component[] = [
  { id: 'root', component: 'Column', children: ['name', 'secret', 'agree', 'submit'] },
  { id: 'name', component: 'TextField', label: 'Name', value: { path: '/form/name' } },
  {
    id: 'secret',
    component: 'TextField',
    label: 'Password',
    value: { path: '/form/secret' },
    variant: 'obscured',
  },
  { id: 'agree', component: 'CheckBox', label: 'I agree', value: { path: '/form/agree' } },
  {
    id: 'submit',
    component: 'Button',
    child: 'submit-label',
    action: {
      event: {
        name: 'submit',
        context: { name: { path: '/form/name' }, agree: { path: '/form/agree' } },
      },
    },
  },
  { id: 'submit-label', component: 'Text', text: 'Submit' },
];

const initial = { form: { name: '', secret: '', agree: false } };

async function press(stdin: { write: (data: string) => void }, ...sequence: string[]) {
  for (const key of sequence) {
    stdin.write(key);
    await settle();
  }
}

/** The label line of the component that carries the focus marker. */
function focusedLine(frame: string | undefined): string | undefined {
  return plain(frame)
    .split('\n')
    .find((line) => line.startsWith('›'));
}

describe('keyboard focus', () => {
  it('focuses the first interactive component', async () => {
    const { lastFrame } = renderSurface(form, initial);
    await settle();
    expect(focusedLine(lastFrame())).toBe('› Name');
  });

  it('moves forward with Tab and back with Shift+Tab in tree order', async () => {
    const { lastFrame, stdin } = renderSurface(form, initial);
    await settle();
    await press(stdin, keys.tab);
    expect(focusedLine(lastFrame())).toBe('› Password');
    await press(stdin, keys.tab, keys.tab);
    expect(focusedLine(lastFrame())).toBe('› [ Submit ]');
    await press(stdin, keys.shiftTab);
    expect(focusedLine(lastFrame())).toBe('› [ ] I agree');
  });

  it('marks the focused component in the focus color', async () => {
    const { lastFrame, stdin } = renderSurface(form, initial);
    await settle();
    await press(stdin, keys.tab, keys.tab, keys.tab);
    expect(lastFrame()).toContain('\u001B[36m');
    expect(focusedLine(lastFrame())).toBe('› [ Submit ]');
  });
});

describe('TextField', () => {
  it('shows typed text and writes it to the data model', async () => {
    const { lastFrame, stdin, surface } = renderSurface(form, initial);
    await settle();
    await press(stdin, 'a', 'b', 'c');
    expect(plain(lastFrame()).split('\n')[1]).toContain('abc');
    expect(surface.dataModel.get('/form/name')).toBe('abc');
  });

  it('supports Backspace and cursor movement', async () => {
    const { stdin, surface } = renderSurface(form, initial);
    await settle();
    await press(stdin, 'a', 'c', keys.left, 'b', keys.right, 'd', keys.backspace);
    expect(surface.dataModel.get('/form/name')).toBe('abc');
  });

  it('masks an obscured field', async () => {
    const { lastFrame, stdin, surface } = renderSurface(form, initial);
    await settle();
    await press(stdin, keys.tab, 'secret');
    expect(surface.dataModel.get('/form/secret')).toBe('secret');
    expect(plain(lastFrame())).not.toContain('secret');
    expect(plain(lastFrame())).toContain('••••••');
  });

  it('shows the label', () => {
    const { lastFrame } = renderSurface(form, initial);
    expect(plain(lastFrame())).toContain('Name');
  });
});

describe('CheckBox', () => {
  it('toggles with Space and writes the bound value', async () => {
    const { lastFrame, stdin, surface } = renderSurface(form, initial);
    await settle();
    await press(stdin, keys.tab, keys.tab, keys.space);
    expect(focusedLine(lastFrame())).toBe('› [x] I agree');
    expect(surface.dataModel.get('/form/agree')).toBe(true);
    await press(stdin, keys.space);
    expect(surface.dataModel.get('/form/agree')).toBe(false);
  });
});

describe('Button', () => {
  it('emits its action on Enter with the resolved context', async () => {
    const { stdin, events } = renderSurface(form, initial);
    await settle();
    await press(stdin, 'A', 'd', 'a', keys.tab, keys.tab, keys.space, keys.tab, keys.enter);
    expect(events).toEqual([
      expect.objectContaining({
        name: 'submit',
        surfaceId: 'main',
        sourceComponentId: 'submit',
        context: { name: 'Ada', agree: true },
      }) as unknown,
    ]);
  });

  it('emits its action on Space', async () => {
    const { stdin, events } = renderSurface([
      { id: 'root', component: 'Button', child: 'label', action: { event: { name: 'confirm' } } },
      { id: 'label', component: 'Text', text: 'OK' },
    ]);
    await settle();
    await press(stdin, keys.space);
    expect(events.map((event) => event.name)).toEqual(['confirm']);
  });

  it('ignores presses while a check fails', async () => {
    const { stdin, events } = renderSurface(
      [
        {
          id: 'root',
          component: 'Button',
          child: 'label',
          action: { event: { name: 'confirm' } },
          checks: [
            {
              condition: { call: 'required', args: { value: { path: '/name' } } },
              message: 'Name is required',
            },
          ],
        },
        { id: 'label', component: 'Text', text: 'OK' },
      ],
      { name: '' },
    );
    await settle();
    await press(stdin, keys.enter);
    expect(events).toEqual([]);
  });
});

describe('TextField checks', () => {
  it('shows the check message after the user edits the field', async () => {
    const { lastFrame, stdin } = renderSurface(
      [
        {
          id: 'root',
          component: 'TextField',
          label: 'Name',
          value: { path: '/name' },
          checks: [
            {
              condition: { call: 'required', args: { value: { path: '/name' } } },
              message: 'Name is required',
            },
          ],
        },
      ],
      { name: '' },
    );
    await settle();
    expect(plain(lastFrame())).not.toContain('Name is required');
    await press(stdin, 'x', keys.backspace);
    expect(plain(lastFrame())).toContain('Name is required');
  });
});
