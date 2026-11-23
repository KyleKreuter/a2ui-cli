# Tasks

## 1. Action history

- [ ] 1.1 Add `seq` and `owner` to `action`, the `history` request and reply, and the `widgetsRemoved` broadcast to `src/protocol/messages.ts`, and verify schema tests
- [ ] 1.2 Implement `src/server/history.ts` (numbering, owner per entry, 500-entry ring buffer), the `history` handling and the `widgetsRemoved` broadcast in the server, and verify tests for numbering, the empty history, the dropped range and a broadcast for `remove` and `clear`
- [ ] 1.3 Implement `src/commands/events.ts` (`--after`, `--widget`, `--mine`, `--wait`, subscribe before the history request, dropped-action warning) and verify end-to-end tests for each `action-history` scenario, including an action that arrives during the history request

## 2. Ask

- [ ] 2.1 Rework `src/commands/ask.ts` to add a widget, wait on its actions only, print `seq`, remove the widget unless `--keep`, keep it on timeout with the stderr hint, and reject `--clear`, and verify tests for each modified `pane-client` scenario
- [ ] 2.2 Add `ask --widget` with `--after` on top of the `events` logic, and exit code 3 on `widgetsRemoved`, and verify tests for each added `pane-client` scenario
- [ ] 2.3 Update `README.md` and `docs/protocol.md` for `ask`, `events`, `seq`, `owner`, `history` and `widgetsRemoved`, and verify the documented commands run as written

## 3. Guide and examples

- [ ] 3.1 Implement `src/guide/` and `src/commands/guide.ts` (component section from the registry and catalog schema, template for the rest) and verify tests that the output lists exactly the registry components, stays under 12 KB, and that every JSON example in it is accepted by a renderer
- [ ] 3.2 Add `examples/spec-progress.sh` (one progress widget per OpenSpec change, updated with `set` from `tasks.md`) and `examples/wizard.sh` (two questions with `ask`), and verify tests that run both scripts against an in-process renderer, with a scripted `tasks.md` change and scripted key presses

## 4. Agent integration

- [ ] 4.1 Write `skills/a2ui-term/SKILL.md` and verify a test for its front matter
- [ ] 4.2 Check the current documentation of Claude Code, Codex and GitHub Copilot CLI for skill installation, instruction files, shell tool time limits and sandbox settings, write `docs/agents.md` with the date of the check, and verify each documented setup on a real install where available

## 5. Doctor

- [ ] 5.1 Implement `src/commands/doctor.ts` (`--json`, exit code 1 on any `fail`) and verify tests for a healthy environment, an old Node.js version (faked), outside tmux and the JSON output

## 6. Acceptance

- [ ] 6.1 In tmux with two Claude Code sessions, ask each agent to run a task with a progress widget and a final question, using only the skill. Verify that both widgets share one board, that each agent receives only its own answer, and that an answer after a forced `ask` timeout arrives through `ask --widget`. Record the results in the pull request
