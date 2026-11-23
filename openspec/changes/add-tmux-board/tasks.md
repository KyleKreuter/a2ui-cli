# Tasks

## 1. Host core

- [ ] 1.1 Add `src/hosts/types.ts` and `src/hosts/runner.ts` (real runner without shell and with a 3 s timeout, `which` without a child process, `FakeRunner`) and verify a test that the real runner passes `x;rm -rf ~` as one literal argument to `printf` and stops a hanging command
- [ ] 1.2 Implement `src/hosts/tmux.ts` and `src/hosts/select.ts` and verify `FakeRunner` snapshots for split (right and down, two sizes), window, exists, label and close, and detection tests for inside tmux, no `TMUX` and a missing `tmux` program

## 2. Launcher

- [ ] 2.1 Implement `src/launcher/` (idempotency, renderer argv, placement settings, 5 s readiness wait, pane close on timeout, fallback message) and verify tests with `FakeRunner` and a fake renderer for each `pane-launcher` scenario that does not need a real host
- [ ] 2.2 Implement `src/commands/open.ts` and verify tests for the JSON output, a second `open` from another pane, an invalid `--size` and the fallback outside tmux

## 3. Commands and board

- [ ] 3.1 Add automatic launch and `--no-open` to `add`, `send` and `ask`, and pane closing to `close`, and verify end-to-end tests with `FakeRunner` that start a real renderer in-process
- [ ] 3.2 Add the owner check and the ended state to the board, `remove --ended`, and the tmux label in `add`, and verify tests with `FakeRunner` for a disappearing owner pane, the cleanup and the label

## 4. Documentation

- [ ] 4.1 Document `open`, automatic launch, `--no-open`, the placement settings, the ended state and `remove --ended` in `README.md` and verify the documented commands run as written in tmux

## 5. Integration

- [ ] 5.1 Add an optional CI job that installs tmux, runs `a2ui-term add examples/progress.jsonl` in a detached tmux session, and verifies with `tmux capture-pane` that the board shows the widget
- [ ] 5.2 Run the manual checklist in tmux with two Claude Code sessions in different windows: the first `add` opens the board without taking focus, the second agent's widgets appear on the same board with its label, and closing one agent's pane marks its widgets as ended. Record the results in the pull request
