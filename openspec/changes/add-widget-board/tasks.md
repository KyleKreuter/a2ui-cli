# Tasks

## 1. Board model

- [x] 1.1 Implement `src/board/registry.ts` (widget ids `w<n>` without reuse, board order, owner and label, plain surfaces as widgets, reserved ids) and verify unit tests for id allocation, a removed id, a plain surface and a reserved id
- [x] 1.2 Implement message rewriting and all-or-nothing application for `add` and `update` in `src/board/apply.ts` and verify tests for a valid `add`, an input without `createSurface`, a failing second message and `createSurface` in `update`
- [x] 1.3 Change the session id resolution in `src/session/id.ts` to flag, environment, `default`, and move the host pane id to the owner resolution, and verify tests for each `sessions` scenario

## 2. Board rendering

- [x] 2.1 Spike scrolling in Ink 8 with `contentOffsetY` inside an `overflowY: "hidden"` box, with 200 rows in a 20-row terminal and one update per 100 ms, and record the result in `design.md`
- [x] 2.2 Implement `src/render/Board.tsx` (12-column grid with wrap, full width below 80 columns, widget frames, empty hint, scrolling keys, focus scrolls into view, stable offset) and replace the tab bar, and verify snapshot and input tests for each `widget-board` layout and scrolling scenario
- [x] 2.3 Update the status line and verify tests for the client count and the content-below indicator

## 3. Protocol and commands

- [x] 3.1 Add the widget messages to `src/protocol/messages.ts` and handle them in `src/server/server.ts`, and verify schema tests and integration tests for each reply and an error with request id
- [x] 3.2 Implement `add`, `update`, `set`, `remove` and `list` in `src/commands/` with the exit codes of M2, and verify end-to-end tests for each `widget-commands` scenario against an in-process renderer
- [x] 3.3 Verify by test that the M2 commands `send`, `ask` and `close` still work and that `send examples/confirm.jsonl` shows a full-width widget `confirm`

## 4. Documentation and examples

- [x] 4.1 Document the board, widget ids, the widget commands and the session change in `README.md` and `docs/protocol.md`, add `examples/board.sh` (two widgets from two owners, updates with `set`, cleanup with `remove --mine`), and verify the documented commands and the script run as written

## 5. Acceptance

- [ ] 5.1 Start `a2ui-term serve` in a tmux pane, run `examples/board.sh` from two other panes at the same time, scroll the board, and verify that both owners' widgets appear side by side, update in place and disappear with `remove --mine`. Archive `add-local-rendering` and `add-pane-server` before archiving this change
