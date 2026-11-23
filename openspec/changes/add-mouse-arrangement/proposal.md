# Proposal

## Why

The board from `add-widget-board` shows widgets in the order agents add them, and the user can only scroll with the keyboard. With several agents, the user wants to put the widgets that matter on top, scroll with the mouse wheel, press a button with a click, and close widgets that are no longer useful. Agents cannot know which widget the user cares about, so the arrangement belongs to the user.

## What Changes

- The board turns on mouse reporting in the terminal and reads mouse events through a filter in front of Ink.
- The mouse wheel scrolls the board.
- A click focuses the component under the pointer, presses Buttons and toggles CheckBoxes.
- Dragging a widget by its title line moves it to another position on the board, with an insertion marker and automatic scrolling at the edges.
- A close mark `[×]` in the title line removes the widget.
- A keyboard move mode does the same without a mouse: move a widget, remove it, cancel.
- The order the user sets stays when agents update or add widgets, and `list` reports it.
- `serve --no-mouse` and `A2UI_TERM_MOUSE=off` turn mouse reporting off. The board shows a hint when tmux has `mouse` off.

## Out of scope

- Resizing widgets with the mouse. Agents set the width.
- Dragging inside components, such as moving a Slider handle.
- Undo for a removed widget.
- Saving the arrangement across renderer restarts.
- Text selection inside the board. The terminal's own selection, usually with a modifier key, or tmux copy mode stays available.

## Capabilities

### New Capabilities

- `board-mouse`: mouse reporting, the input filter, the wheel, clicks, and the settings to turn the mouse off.
- `widget-arrangement`: moving and removing widgets by drag, close mark and keyboard move mode.

### Modified Capabilities

- `widget-board`: the board order follows the user's moves.
- `tmux-host`: reads the tmux `mouse` option.
- `diagnostics`: `doctor` reports the tmux `mouse` option.

## Impact

- New modules: `src/render/mouse/` (parser, filter stream, hit testing), `src/render/arrange/` (drag state, move mode).
- `src/render/Board.tsx`, `src/server/board.ts`, `src/commands/serve.ts`, `src/hosts/tmux.ts` and `src/commands/doctor.ts` change.
- No new runtime dependencies.
