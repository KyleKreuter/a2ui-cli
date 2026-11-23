# Design

## Context

`add-widget-board` provides widgets with board-assigned ids, owners and the commands `add`, `update`, `set`, `remove` and `list`. `add-tmux-board` opens the board on demand. See `proposal.md` for motivation. Agent shell tools have time limits: Claude Code's Bash tool stops a command after 2 minutes by default (up to 10 minutes per call). Task 4.2 verifies the limits of Claude Code, Codex and GitHub Copilot CLI against their current documentation.

## Goals / Non-Goals

**Goals:**

- Every interaction is one short shell command with JSON on stdout and a defined exit code.
- An agent only ever receives actions of its own widgets, unless it asks for more.
- No user action is lost when a client stops, as long as the renderer runs.
- An agent learns the interface from `a2ui-term guide` alone.

**Non-Goals:**

- Server-side "unread" state. Clients track their own position with `seq`.

## Decisions

### `ask` on the board

`a2ui-term ask [file|-] [--width] [--title] [--label] [--keep] [--timeout <s>]` sends the input as one `add` request, so the same rules apply: exactly one `createSurface`, all or nothing, a board-assigned widget id. After the `added` reply, `ask` waits for the first action whose `surfaceId` is that widget id, prints it and removes the widget, unless `--keep` is given. The default width of a question is 12, so that it stands out on the board.

`a2ui-term ask --widget <id> [--after <seq>] [--timeout <s>]` sends nothing. It returns the first action of that widget with `seq > after`, first from the history, then from broadcasts. Without `--after`, it waits for a new action only. It never removes the widget, because the widget belongs to whoever created it.

On a timeout, `ask` exits with code 2, prints nothing on stdout, and does not remove the widget. Stderr says:

```text
a2ui-term: no answer within 100 s; widget w5 stays on the board
a2ui-term: pick up the answer with: a2ui-term ask --widget w5 --after 12
```

`12` is the highest `seq` when `ask` started to wait, so an answer given between the two calls is not lost. The follow-up `ask --widget` does not remove the widget either; the agent runs `a2ui-term remove w5` when done.

Alternative: keep M2's rule that `ask` returns the first action of any surface. Rejected: on a shared board, `ask` would return another agent's button press.

### `--clear` only for `send`

`clear` removes every widget of every agent. `ask` does not need it anymore, because widget ids never collide. `send --clear` stays for scripts that own the whole board.

### Widget removal broadcast

When widgets leave the board, through `remove`, `clear` or, after `add-mouse-arrangement`, the user, the server broadcasts `{"type":"widgetsRemoved","widgetIds":[...]}`. An `ask` that waits on a removed widget exits with code 3 and names the widget. Exit code 3 then means "the renderer or the widget was closed".

### Action history with sequence numbers

The server numbers every action from 1, in the order it broadcasts them, and keeps the last 500 in a ring buffer. Each kept action also stores the widget owner, so that filters by owner work after the widget is gone. The `history` client message `{"type":"history","id","after"}` returns `{"type":"history","id","actions":[...],"last"}` to the sender, where `last` is the highest `seq` the server assigned. The broadcast `action` message gains `seq` and `owner`.

Alternative: server-side consumption, where `events` removes what it printed. Rejected: two clients, or one client that crashes after reading, lose actions. A cursor that the client keeps is idempotent.

### `events`

`a2ui-term events [--after <seq>] [--widget <id>]... [--mine] [--wait <seconds>]` prints each matching action with `seq > after` as one JSON line. `--mine` keeps actions whose owner is the caller's owner. Without matches, it exits with 0 and prints nothing, or with `--wait` waits for the next matching broadcast and exits with 2 on timeout. When the oldest kept action has `seq > after + 1`, actions were dropped; `events` writes the number of dropped actions to stderr. To avoid a gap between the history reply and the broadcast, the client subscribes first: it connects, sends `history`, and buffers broadcasts that arrive before the reply, dropping those with `seq <= last`. `ask --widget` uses the same logic.

### Guide

`a2ui-term guide` prints Markdown to stdout. The component section comes from the renderer's catalog registry and the catalog schema of `@a2ui/web_core`, so it lists exactly the components the renderer supports, with their properties. The rest is a template in `src/guide/guide.md` with the commands, the exit codes, the message rules (`"version": "1.0"`, `@path`, identifier ids, Markdown headings), the widget id lifecycle, and three patterns: a progress widget updated with `set`, a question with `ask`, and a multi-step flow. The output stays under 12 KB so that an agent can read it in one tool call.

### Examples

`examples/spec-progress.sh <change>` adds a progress widget for an OpenSpec change and updates it with `set` from the checkboxes in its `tasks.md` whenever the file changes. It reads the file, not the agent, so the agent spends no tokens on progress updates. `examples/wizard.sh` asks two questions in a row with `ask`.

### Agent Skill and snippets

`skills/a2ui-term/SKILL.md` follows the Agent Skills format: a name, a description that says when to use the board, and instructions that call `a2ui-term guide`. `docs/agents.md` shows how to install the skill for Claude Code, Codex and GitHub Copilot CLI, gives a short `AGENTS.md` / `CLAUDE.md` snippet for agents without skill support, and explains timeouts and sandboxes. Task 4.2 checks each tool's current documentation before writing the setup steps.

### Doctor

`a2ui-term doctor [--json]` checks: Node.js version, platform support for Unix sockets, the runtime directory and its mode, the resolved session id and where it came from, the owner id and where it came from, the host detection result with its reason, whether a renderer answers for the session and how many widgets it holds, and the versions of a2ui-term, `@a2ui/web_core` and the A2UI protocol. Each check is `ok`, `warn` or `fail`. Any `fail` gives exit code 1.

## Risks / Trade-offs

- [The history keeps answers in memory, including text that the user typed] → It lives only in the renderer process of the user, holds at most 500 actions, and goes away with the renderer. The runtime directory has mode `0700`.
- [Question widgets that time out pile up on the board] → The stderr hint names the widget; the guide tells agents to `remove` it when done; `remove --mine` and `remove --ended` clean up.
- [Agent tool limits and skill formats change] → They appear only in `docs/agents.md` and the guide, with the date of the check.
- [The guide grows with every component] → A test fails when the output exceeds 12 KB.
