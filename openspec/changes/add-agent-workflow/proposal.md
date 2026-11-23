# Proposal

## Why

With `add-widget-board` and `add-tmux-board`, agents place widgets on a shared board and update them by id. Two things are missing for real agent work. First, questions: `ask` from M2 shows plain surfaces and returns the next action of any surface, so on a shared board it returns another agent's button press. Second, answers get lost: agent tool calls time out, typically after a few minutes, and an answer that arrives after `ask` stopped is gone. Agents also need to learn the interface from the shell, without reading the source.

## What Changes

- `ask` places its input as a widget, waits for an action on that widget only, prints it with its sequence number, and removes the widget afterwards. `--keep` leaves it on the board.
- `ask --widget <id>` waits for the next action of a widget that is already on the board, such as a Cancel button on a progress widget.
- After a timeout, the question widget stays on the board, and stderr shows the command that picks up the answer later.
- The renderer keeps a numbered history of user actions. Add `a2ui-term events`, which prints actions after a sequence number, filtered by widget or owner, and can wait for the next one.
- Every action carries `seq` and the widget `owner`. The board broadcasts when widgets are removed.
- `ask` no longer accepts `--clear`, because clearing the board would remove other agents' widgets.
- Add `a2ui-term guide`, a reference for agents with commands, exit codes, message rules, supported components and patterns for progress, questions and multi-step flows.
- Ship an Agent Skill and instruction snippets for Claude Code, Codex and GitHub Copilot CLI.
- Add `a2ui-term doctor` for environment diagnostics.
- Add example scripts: spec progress from an OpenSpec `tasks.md`, and a multi-step question flow.

## Out of scope

- An MCP server. Agents use the shell commands.
- A2UI Express input. JSON stays the only input format.
- Components beyond the M1 set (`extend-basic-catalog`) and charts (`add-terminal-charts`).
- History that survives a renderer restart.
- Removing widgets with the mouse or keyboard (`add-mouse-arrangement`).

## Capabilities

### New Capabilities

- `action-history`: the renderer's action history and the `events` command.
- `agent-guide`: the `guide` command, the Agent Skill, the examples and the agent setup documentation.
- `diagnostics`: the `doctor` command.

### Modified Capabilities

- `pane-client`: `ask` works on widgets, gains `--widget` and `--keep`, and loses `--clear`.
- `socket-protocol`: actions carry `seq` and `owner`; adds the `history` request and the `widgetsRemoved` broadcast.

## Impact

- New modules: `src/server/history.ts`, `src/commands/{events,guide,doctor}.ts`, `src/guide/`.
- New files: `skills/a2ui-term/SKILL.md`, `docs/agents.md`, `examples/spec-progress.sh`, `examples/wizard.sh`.
- `src/protocol/messages.ts`, `src/server/server.ts`, `src/client/client.ts` and `src/commands/ask.ts` change. No new runtime dependencies.
