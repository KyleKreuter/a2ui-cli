# Tasks

## 1. Mouse input

- [ ] 1.1 Implement `src/render/mouse/` (SGR parser, filter stream that forwards `isTTY`, `setRawMode`, `ref` and `unref`) and verify tests for split reports, mixed key and mouse input, and typing in a TextField
- [ ] 1.2 Turn mouse reporting on and off in `serve` (normal exit, signal, uncaught error), add `--no-mouse` and `A2UI_TERM_MOUSE`, and verify tests on the written escape sequences
- [ ] 1.3 Implement hit testing with `measureElement` and the scroll offset, wheel scrolling and clicks on Button, CheckBox and TextField, and verify input tests for each `board-mouse` click and wheel scenario and a render time below 50 ms with 50 widgets

## 2. Arrangement

- [ ] 2.1 Implement the drag state in `src/render/arrange/` (start on the title line, insertion marker, highlight, auto-scroll, cancel, updates during a drag) and the order list in the board, and verify input tests for each drag scenario
- [ ] 2.2 Add the close mark and the keyboard move mode, route user removals through the `remove` path, and verify tests that a waiting `ask` exits with code 3 and for each move mode scenario
- [ ] 2.3 Report the user order in `list` and verify a test for the `widget-board` scenario "User order stays"

## 3. Host and diagnostics

- [ ] 3.1 Add the mouse option command to the tmux adapter, the status line hint and the `doctor` mouse check, and verify `FakeRunner` tests for on, off and inherited off

## 4. Documentation

- [ ] 4.1 Document the mouse actions, the move mode keys, `--no-mouse`, the tmux `mouse` option and text selection with a modifier key or tmux copy mode in `README.md`, and verify every documented key works as written

## 5. Acceptance

- [ ] 5.1 Archive `add-widget-board`, `add-tmux-board` and `add-agent-workflow` before this change. Then, in tmux 3.8 with default options, in iTerm2 and in the macOS Terminal, scroll with the wheel, press a Button, drag a widget to the front while an agent updates another widget, close a widget, and repeat with `tmux set -g mouse off` using move mode. Record the results in the pull request
