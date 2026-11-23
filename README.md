# a2ui-term

Render [A2UI](https://a2ui.org) surfaces in a terminal pane, and drive them from scripts, the shell, or coding agents over MCP.

> **Status:** early development. Milestones M1 (local rendering with `a2ui-term demo`) and M2 (`serve`, `send`, `ask`, `close`) are implemented. The package is not on npm yet. The design lives in [`openspec/changes/`](openspec/changes/).

## What it does

Available now:

- Renders A2UI 1.0 surfaces in the terminal with [Ink](https://github.com/vadimdemedes/ink): Text, Row, Column, Card, Divider, Button, TextField and CheckBox. Other components show as `[unsupported: <type>]`.
- Renders a Markdown subset in Text: headings, list items, bold, italic and inline code.
- `a2ui-term demo` renders A2UI messages from a file or stdin in the current terminal.
- `a2ui-term serve` runs a renderer in its own terminal. Scripts send it UI with `a2ui-term send` and wait for the user's answer with `a2ui-term ask`, which prints the action as JSON.

Planned (see [Roadmap](#roadmap)):

- Opens the renderer in a new pane next to you: tmux first, then Zellij, WezTerm and kitty. Other hosts plug in as TOML files or external programs.
- Runs as an MCP server (`a2ui-term mcp`) so that agents such as Claude Code, GitHub Copilot CLI and Codex can ask the user through terminal UI.
- Accepts A2UI Express, a compact UI notation that costs agents fewer tokens than A2UI JSON.

a2ui-term builds only on the official A2UI packages: `@a2ui/web_core` for protocol and state, and `@a2ui/agent` for Express compilation.

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

| Key                      | Action                                     |
| ------------------------ | ------------------------------------------ |
| `Tab` / `Shift+Tab`      | Move focus to the next / previous input    |
| `Enter` or `Space`       | Press the focused button                   |
| `Space`                  | Toggle the focused checkbox                |
| `Ctrl+Left / Ctrl+Right` | Switch surfaces, if there is more than one |
| `q` or `Esc`             | Quit, except while a text field has focus  |
| `Ctrl+C`                 | Quit                                       |

The status line shows the last action. The demo also writes every action, every message for the agent (such as the response to a `callRendererFunction` message) and every invalid message as one JSON line to its log file:

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

`serve` runs a renderer for a session in its own terminal. Other processes send it A2UI messages over a Unix domain socket and receive the user's actions. This works on macOS and Linux.

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

| Command                                | Does                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `serve`                                | Renders the session's surfaces in this terminal until you press `q`, a client sends `close`, or it gets a signal. |
| `send [file] [--clear]`                | Sends A2UI messages and exits when the renderer has accepted all of them. `--clear` removes all surfaces first.   |
| `ask [file] [--clear] [--timeout <s>]` | Like `send`, then waits for the next user action and prints it as JSON.                                           |
| `close`                                | Stops the renderer. Succeeds also when no renderer runs.                                                          |

`send` and `ask` read JSON Lines or a JSON array, from a file or from stdin (`-` or no file). They parse the whole input first and send nothing if a line is invalid. `ask` ignores actions that happened before it sent its messages.

A surface id can exist only once per renderer, so a second `ask` with the same file fails with `Surface confirm already exists`. To show the same file again, pass `--clear`: it removes all surfaces before the new messages arrive. The user sees no empty screen in between.

```bash
a2ui-term ask --clear --timeout 60 examples/confirm.jsonl
```

`a2ui-term send --clear < /dev/null` only removes all surfaces.

Without `--session`, the commands use `$A2UI_TERM_SESSION`, then an id derived from the current tmux, Zellij, WezTerm or kitty pane, then `default`. The renderer status line shows the session, the host and the number of connected clients.

### Exit codes

| Code | Meaning                                                                              |
| ---- | ------------------------------------------------------------------------------------ |
| `0`  | Success.                                                                             |
| `1`  | Error, for example no renderer runs for the session, or an invalid flag.             |
| `2`  | `ask` got no action before `--timeout`.                                              |
| `3`  | The user closed the renderer while `ask` waited.                                     |
| `4`  | The input is not valid JSON Lines or JSON, or the renderer rejected an A2UI message. |

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

Each milestone is one OpenSpec change with a proposal, specs, a design and tasks.

| Milestone | Change                                                                   | Scope                                                                         |
| --------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| M1        | [`add-local-rendering`](openspec/changes/add-local-rendering/)           | Project setup, runtime, Ink renderer for 8 components, `demo`                 |
| M2        | [`add-pane-server`](openspec/changes/add-pane-server/)                   | Sessions, socket protocol, `serve`, `send`, `ask`, `close`                    |
| M3        | [`add-host-adapters`](openspec/changes/add-host-adapters/)               | Host adapters (tmux, TOML, external programs), `open`, `hosts`, configuration |
| M4        | [`add-express-and-mcp`](openspec/changes/add-express-and-mcp/)           | Express input, `compile`, MCP server, `doctor`                                |
| M5        | [`extend-catalog-and-hosts`](openspec/changes/extend-catalog-and-hosts/) | Remaining components, Zellij, WezTerm, kitty, npm release                     |

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
