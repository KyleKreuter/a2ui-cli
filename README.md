# a2ui-term

A live [A2UI](https://a2ui.org) board next to your coding agents in the terminal. Agents, or any script, place widgets on it with shell commands: progress, results, charts and questions. Each widget gets an id, which the agent uses to update or remove it, and the user's answers come back as JSON.

> **Status:** early development. Milestones M1 (local rendering with `a2ui-term demo`), M2 (`serve`, `send`, `ask`, `close`), M3 (the widget board with `add`, `update`, `set`, `remove`, `list`) and M4 (the board pane in tmux with `open`) are implemented. The package is not on npm yet. The specs of the finished milestones live in [`openspec/specs/`](openspec/specs/), the plans for the next ones in [`openspec/changes/`](openspec/changes/).

## Why a board

Claude Code, Codex and GitHub Copilot CLI can already ask the user a question with their built-in tools, and some show their own task list. a2ui-term does not replace that. It adds one pane that all your agents share while they work: the progress of each agent's spec side by side, a chart that grows with every test run, a question with context that waits until you have time. You scroll the board, arrange the widgets and close the ones you no longer need. Everything goes through plain commands, so every agent with a shell tool can use it, without an MCP server.

## What it does

Available now:

- Renders A2UI 1.0 surfaces in the terminal with [Ink](https://github.com/vadimdemedes/ink): Text, Row, Column, Card, Divider, Button, TextField and CheckBox. Other components show as `[unsupported: <type>]`.
- Renders a Markdown subset in Text: headings, list items, bold, italic and inline code.
- `a2ui-term demo` renders A2UI messages from a file or stdin in the current terminal.
- `a2ui-term serve` runs the board in its own terminal. Scripts send it UI with `a2ui-term send` and wait for the user's answer with `a2ui-term ask`, which prints the action as JSON.
- The board shows all widgets in a 12-column grid and scrolls. `a2ui-term add` places a widget and prints its id; `update`, `set`, `remove` and `list` work with that id.
- In tmux, the first `add`, `send` or `ask` opens the board in a pane next to the agent, without taking the focus. The board marks the widgets of agents whose pane has closed as ended.

Planned (see [Roadmap](#roadmap)):

- Opens the board in Zellij, WezTerm and kitty too.
- `ask` shows a question as a widget and returns only the answer to that widget. A history of the user's actions with `a2ui-term events` keeps answers after an agent's tool call has timed out. `a2ui-term guide` and an Agent Skill teach agents the interface.
- Arrange widgets with the mouse: scroll with the wheel, drag a widget by its title, close it with `[×]`. A keyboard move mode does the same without a mouse.
- Renders the whole A2UI 1.0 basic catalog: lists, tabs, modals, choices, sliders and icons.
- Draws charts from the A2UI `VegaChart` component, for a subset of Vega-Lite.
- Other hosts plug in as TOML files or external programs.

a2ui-term builds only on the official A2UI package `@a2ui/web_core` for protocol and state.

## Install

a2ui-term needs Node.js 22 or later. Until the first npm release, install it from source:

```bash
git clone https://github.com/KyleKreuter/a2ui-cli.git
cd a2ui-cli
npm install
npm run build
npm link
```

`npm link` puts the `a2ui-term` command on your `PATH`. Check the installation:

```bash
a2ui-term --version
```

The command prints the package version and the supported A2UI version, for example `0.1.0 (A2UI 1.0)`.

## Try it: `a2ui-term demo`

`demo` renders A2UI messages in the current terminal. It reads a file, or stdin if you pass `-` or no file:

```bash
a2ui-term demo examples/hello.jsonl
```

```bash
cat examples/form.jsonl | a2ui-term demo
```

The input is JSON Lines (one A2UI message per line) or one JSON array of messages. Invalid lines and messages do not stop the demo; it reports them on stderr when it exits.

`demo` shows the surfaces as widgets on a board, the same board that `serve` shows. The keys are the same in both:

| Key                 | Action                                                                |
| ------------------- | --------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Move the focus to the next / previous input. The board scrolls to it. |
| `Enter` or `Space`  | Press the focused button                                              |
| `Space`             | Toggle the focused checkbox                                           |
| `PgUp` / `PgDn`     | Scroll one page                                                       |
| `Home` / `End`      | Scroll to the top / bottom                                            |
| `↑` / `↓`           | Scroll one line, except while a text field has focus                  |
| `?`                 | Show or hide the key list, except while a text field has focus        |
| `q` or `Esc`        | Quit, except while a text field has focus                             |
| `Ctrl+C`            | Quit                                                                  |

The status line shows the number of widgets and whether the board has more content above or below the visible part. The demo also writes every action, every message for the agent (such as the response to a `callRendererFunction` message) and every invalid message as one JSON line to its log file:

| Platform | Log file                                                         |
| -------- | ---------------------------------------------------------------- |
| macOS    | `~/Library/Logs/a2ui-term/a2ui-term.log`                         |
| Linux    | `$XDG_STATE_HOME/a2ui-term/a2ui-term.log` (`~/.local/state/...`) |
| Windows  | `%LOCALAPPDATA%\a2ui-term\Log\a2ui-term.log`                     |

On Windows, pass a file: reading keys while stdin is a pipe is not supported there.

### Examples

| File                                                 | Shows                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| [`examples/hello.jsonl`](examples/hello.jsonl)       | A card with a Markdown heading, body text and a caption          |
| [`examples/form.jsonl`](examples/form.jsonl)         | A sign-up form with text fields, a checkbox, a check and buttons |
| [`examples/confirm.jsonl`](examples/confirm.jsonl)   | A yes/no confirmation                                            |
| [`examples/progress.jsonl`](examples/progress.jsonl) | Text bound to the data model, changed by `updateDataModel`       |
| [`examples/board.sh`](examples/board.sh)             | One agent on the board: `add`, `set` and `remove --mine`         |

### Writing messages for a2ui-term

a2ui-term accepts A2UI 1.0 messages with the [1.0 basic catalog](https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json) only:

- Every message needs `"version": "1.0"`. a2ui-term rejects messages for other versions and messages without a version.
- Bind values with `{"@path": "/form/name"}` and call functions with `{"@call": "required", "args": {...}}`. The v0.9 forms `{"path": ...}` and `{"call": ...}` do not bind in 1.0: they show as literal values.
- Component ids must be identifiers: `submitLabel` works, `submit-label` fails validation.
- Text has no heading variants in 1.0. Write headings as Markdown, for example `"text": "## Sign up"`.

Save this message as `hi.jsonl` and run `a2ui-term demo hi.jsonl`:

<!-- prettier-ignore -->
```json
{"version":"1.0","createSurface":{"surfaceId":"hi","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json","components":[{"id":"root","component":"Text","text":"## Hello, **terminal**"}]}}
```

## Ask the user from a script: `serve`, `send`, `ask`, `close`

`serve` runs the board for a session in its own terminal. Other processes send it A2UI messages over a Unix domain socket and receive the user's actions. This works on macOS and Linux. In tmux, `send` and `ask` open the board themselves, see [The board in tmux](#the-board-in-tmux-open).

1. In a second terminal, start the renderer:

   ```bash
   a2ui-term serve --session demo
   ```

2. In your first terminal, show a form and wait for the answer:

   ```bash
   a2ui-term ask --session demo examples/form.jsonl
   ```

3. In the renderer, fill in the form and press **Submit**. `ask` prints the action as one JSON line and exits with code 0:

   <!-- prettier-ignore -->
   ```json
   {"surfaceId":"signup","name":"submit","sourceComponentId":"submit","timestamp":"2026-11-23T10:00:05.000Z","context":{"name":"Ada","email":"ada@example.org","newsletter":true}}
   ```

4. Stop the renderer:

   ```bash
   a2ui-term close --session demo
   ```

| Command                                | Does                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `serve`                                | Shows the session's board in this terminal until you press `q`, a client sends `close`, or it gets a signal.   |
| `send [file] [--clear]`                | Sends A2UI messages and exits when the renderer has accepted all of them. `--clear` removes all widgets first. |
| `ask [file] [--clear] [--timeout <s>]` | Like `send`, then waits for the next user action and prints it as JSON.                                        |
| `close`                                | Stops the renderer. Succeeds also when no renderer runs.                                                       |

`send` and `ask` read JSON Lines or a JSON array, from a file or from stdin (`-` or no file). They parse the whole input first and send nothing if a line is invalid. `ask` ignores actions that happened before it sent its messages.

Each surface from `send` or `ask` shows as a full-width widget whose id is its surface id, for example `confirm`. A surface id can exist only once per renderer, so a second `ask` with the same file fails with `Surface confirm already exists`. To show the same file again, pass `--clear`: it removes all widgets before the new messages arrive. The user sees no empty screen in between. Surface ids of the form `w<number>`, for example `w9`, are reserved for widgets that `add` creates.

```bash
a2ui-term ask --clear --timeout 60 examples/confirm.jsonl
```

`a2ui-term send --clear < /dev/null` only removes all widgets.

Without `--session`, the commands use `$A2UI_TERM_SESSION`, then `default`. So all agents on a machine share one board, unless you give them different sessions. The status line of the board shows the session, the number of widgets and the number of connected clients.

## Place widgets on the board: `add`, `update`, `set`, `remove`, `list`

Every agent places its own widgets on the shared board and gets an id back for each one. With that id, the agent changes or removes its widget later. The id stays valid until the widget is removed, and the board never gives it to another widget.

1. Outside tmux, start the board in a second terminal. In tmux, skip this step: `add` opens the board, see [The board in tmux](#the-board-in-tmux-open).

   ```bash
   a2ui-term serve
   ```

2. Add a widget. `add` prints its id as JSON:

   ```bash
   a2ui-term add --title Build --width 6 examples/progress.jsonl
   ```

   ```json
   { "widgetId": "w1" }
   ```

3. Change values in the data model of the widget. Each value is JSON, or text with `--text`:

   ```bash
   a2ui-term set w1 /percent '"60%"'
   ```

   ```bash
   a2ui-term set --text w1 /step "Running tests" /percent 90%
   ```

4. Remove the widget:

   ```bash
   a2ui-term remove w1
   ```

| Command                                                       | Does                                                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `add [file] [--width <1-12>] [--title] [--label] [--no-open]` | Creates a widget from exactly one `createSurface` and its `updateComponents` and `updateDataModel` messages. Prints its id. |
| `update <widgetId> [file]`                                    | Applies `updateComponents` and `updateDataModel` messages to the widget. It keeps its place on the board.                   |
| `set <widgetId> <path> <value>... [--text] [--delete <path>]` | Sets values at JSON Pointer paths, for example `/percent`. `--delete` removes the value at a path and can repeat.           |
| `remove <widgetId>...`, `remove --mine` or `remove --ended`   | Removes the named widgets, all widgets of the caller's owner, or all ended widgets. Prints the removed ids as JSON.         |
| `list [--mine]`                                               | Prints all widgets in board order as JSON, with id, title, label, owner, width, position and ended state.                   |

The surface id in the input of `add` does not matter: the board replaces it with the widget id. `add` and `update` apply all messages or none. When one message fails validation, the command exits with code 4 and the board stays as it was. The same is true for `remove` with an id that does not exist.

The grid has 12 columns, and a widget is 6 columns wide by default. Widgets fill a row from left to right and wrap to the next row. Below 80 terminal columns, every widget takes the full width.

### Owners and labels

`add` records the owner of a widget, so that `remove --mine` and `list --mine` find the widgets of one agent. The owner is the first of:

1. The `--owner` flag.
2. The `A2UI_TERM_OWNER` environment variable.
3. The pane of the terminal host that runs the command:

   | Host    | Variable          | Owner, for example |
   | ------- | ----------------- | ------------------ |
   | tmux    | `TMUX_PANE`       | `tmux:%3`          |
   | Zellij  | `ZELLIJ_PANE_ID`  | `zellij:7`         |
   | WezTerm | `WEZTERM_PANE`    | `wezterm:12`       |
   | kitty   | `KITTY_WINDOW_ID` | `kitty:4`          |

   tmux comes first, so tmux inside WezTerm or kitty gives a tmux owner.

Without any of these, a widget has no owner, and `--mine` exits with code 1. The top border of a widget shows its title, its label and its id, for example `╭─ Build · api-agent · w3 ─╮`. The label is `--label`, then `A2UI_TERM_LABEL`, then the tmux window name and pane index of the caller, for example `api:1`, then the owner.

[`examples/board.sh`](examples/board.sh) plays one agent. Run it from two panes at the same time, or with two owners in one terminal:

```bash
A2UI_TERM_OWNER=api examples/board.sh API & A2UI_TERM_OWNER=web examples/board.sh Web & wait
```

## The board in tmux: `open`

In tmux, agents need no second terminal. The first `add`, `send` or `ask` of a session opens the board in a pane to the right of the agent's pane and keeps the focus in the agent's pane. Every later command uses that board, also from other panes, windows and tmux sessions.

To open the board before the first widget, run `open`. It prints where the board runs as JSON:

```bash
a2ui-term open
```

```json
{
  "session": "default",
  "socket": "/tmp/a2ui-term-501/default.sock",
  "host": "tmux",
  "paneId": "%9"
}
```

When a renderer already runs for the session, `open` opens no pane and prints the same JSON.

| Setting   | Flag                         | Environment variable  | Default |
| --------- | ---------------------------- | --------------------- | ------- |
| Placement | `--placement split\|window`  | `A2UI_TERM_PLACEMENT` | `split` |
| Direction | `--direction right\|down`    | `A2UI_TERM_DIRECTION` | `right` |
| Size      | `--size <percent>` (10 – 90) | `A2UI_TERM_SIZE`      | `40`    |

`split` splits the agent's pane, and `window` gives the board a tmux window of its own named `a2ui`. Users with agents in several windows choose `window`. The automatic launch of `add`, `send` and `ask` takes the settings from the environment variables. With `--no-open`, these commands do not open the board and exit with code 1 when no renderer runs.

Outside tmux, `open` and the automatic launch name the reason and the command for a second terminal, for example `a2ui-term serve --session default`, and exit with code 1. Support for Zellij, WezTerm and kitty follows in the next milestone.

`close` stops the renderer and closes the board pane, also when tmux keeps panes after their command exits (`remain-on-exit`). A pane in which you started `serve` yourself stays open.

### Ended widgets

When the pane of an agent closes, or its command exits, the board marks the widgets of that agent within 3 seconds: they show dimmed with the tag `ended`, for example `╭─ Build · api:1 · w3 · ended ─╮`. The board keeps them, because a result can still be useful. Remove all ended widgets with:

```bash
a2ui-term remove --ended
```

```json
{ "removed": ["w1", "w4"] }
```

The board checks only owners of the form `tmux:<pane>`. Widgets with other owners never end.

## Exit codes

| Code | Meaning                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Success.                                                                                                                                                  |
| `1`  | Error, for example no renderer runs and none can be opened, an invalid flag, a failed tmux command, or `--mine` without an owner.                         |
| `2`  | `ask` got no action before `--timeout`.                                                                                                                   |
| `3`  | The user closed the renderer while `ask` waited.                                                                                                          |
| `4`  | The input is not valid JSON Lines or JSON, or the renderer rejected an A2UI message or a widget request, for example for a widget id that does not exist. |

For example, a shell script can branch on the answer:

```bash
if answer=$(a2ui-term ask --clear --timeout 60 examples/confirm.jsonl); then
  echo "User chose: $answer"
else
  echo "No answer (exit code $?)"
fi
```

To write your own client in another language, see [`docs/protocol.md`](docs/protocol.md).

## Roadmap

Each milestone is one OpenSpec change with a proposal, specs, a design and tasks. Finished milestones live in [`openspec/changes/archive/`](openspec/changes/archive/), and their specs in [`openspec/specs/`](openspec/specs/).

| Milestone | Change                                                                            | Scope                                                                                      |
| --------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| M1        | [`add-local-rendering`](openspec/changes/archive/2026-11-23-add-local-rendering/) | Project setup, runtime, Ink renderer for 8 components, `demo`                              |
| M2        | [`add-pane-server`](openspec/changes/archive/2026-11-23-add-pane-server/)         | Sessions, socket protocol, `serve`, `send`, `ask`, `close`                                 |
| M3        | [`add-widget-board`](openspec/changes/archive/2026-11-23-add-widget-board/)       | Shared board with a 12-column grid and scrolling, `add`, `update`, `set`, `remove`, `list` |
| M4        | [`add-tmux-board`](openspec/changes/archive/2026-11-23-add-tmux-board/)           | Board pane in tmux, `open`, automatic launch, ended widgets                                |
| M5        | [`add-terminal-hosts`](openspec/changes/add-terminal-hosts/)                      | Board pane in Zellij, WezTerm and kitty                                                    |
| M6        | [`add-agent-workflow`](openspec/changes/add-agent-workflow/)                      | `ask` on widgets, action history with `events`, `guide`, Agent Skill, `doctor`             |
| M7        | [`add-mouse-arrangement`](openspec/changes/add-mouse-arrangement/)                | Mouse wheel, clicks, drag to arrange, close mark, keyboard move mode                       |
| M8        | [`extend-basic-catalog`](openspec/changes/extend-basic-catalog/)                  | Remaining basic catalog components, stable focus, help overlay                             |
| M9        | [`add-terminal-charts`](openspec/changes/add-terminal-charts/)                    | `VegaChart` with a Vega-Lite subset, live chart updates                                    |
| M10       | [`prepare-release`](openspec/changes/prepare-release/)                            | License, package contents, changelog, npm release with provenance                          |
| M11       | [`add-more-hosts`](openspec/changes/add-more-hosts/)                              | TOML and external host adapters, host priorities, `hosts`, configuration file              |

## Development

```bash
npm install
npm run dev -- demo examples/hello.jsonl
```

| Script                 | Does                                  |
| ---------------------- | ------------------------------------- |
| `npm run dev -- <cmd>` | Runs the CLI from `src/` with `tsx`   |
| `npm run build`        | Bundles `src/cli.ts` to `dist/cli.js` |
| `npm test`             | Runs the tests with Vitest            |
| `npm run test:tmux`    | Runs the smoke test with a real tmux  |
| `npm run typecheck`    | Type-checks with `tsc`                |
| `npm run lint`         | Lints with ESLint                     |
| `npm run format`       | Formats with Prettier                 |

## Contributing

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven development.

1. Read the change you want to work on: `openspec show <change>`.
2. Implement its tasks in order and tick them off in `tasks.md`.
3. Run `openspec validate <change> --strict` before you open a pull request.
4. After merge, a maintainer archives the change with `openspec archive <change>`, which moves its specs into `openspec/specs/`.

New features start as a new change: `openspec new change <name>`.
