# a2ui-term

Render [A2UI](https://a2ui.org) surfaces in a terminal pane, and drive them from scripts, the shell, or coding agents over MCP.

> **Status:** early development. Milestone M1 (local rendering with `a2ui-term demo`) is implemented. The package is not on npm yet. The design lives in [`openspec/changes/`](openspec/changes/).

## What it does

Available now:

- Renders A2UI 1.0 surfaces in the terminal with [Ink](https://github.com/vadimdemedes/ink): Text, Row, Column, Card, Divider, Button, TextField and CheckBox. Other components show as `[unsupported: <type>]`.
- Renders a Markdown subset in Text: headings, list items, bold, italic and inline code.
- `a2ui-term demo` renders A2UI messages from a file or stdin in the current terminal.

Planned (see [Roadmap](#roadmap)):

- Opens the renderer in a new pane next to you: tmux first, then Zellij, WezTerm and kitty. Other hosts plug in as TOML files or external programs.
- Lets scripts show UI and wait for the user's answer: `a2ui-term ask form.jsonl` prints the user's action as JSON.
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
