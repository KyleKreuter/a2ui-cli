# a2ui-term

Render [A2UI](https://a2ui.org) surfaces in a terminal pane, and drive them from scripts, the shell, or coding agents over MCP.

> **Status:** planning. No code is released yet. The design lives in [`openspec/changes/`](openspec/changes/).

## What it does

- Renders A2UI v0.9 surfaces in the terminal with [Ink](https://github.com/vadimdemedes/ink).
- Opens the renderer in a new pane next to you: tmux first, then Zellij, WezTerm and kitty. Other hosts plug in as TOML files or external programs.
- Lets scripts show UI and wait for the user's answer: `a2ui-term ask form.jsonl` prints the user's action as JSON.
- Runs as an MCP server (`a2ui-term mcp`) so that agents such as Claude Code, GitHub Copilot CLI and Codex can ask the user through terminal UI.
- Accepts A2UI Express, a compact UI notation that costs agents fewer tokens than A2UI JSON.

a2ui-term builds only on the official A2UI packages: `@a2ui/web_core` for protocol and state, and `@a2ui/agent` for Express compilation.

## Roadmap

Each milestone is one OpenSpec change with a proposal, specs, a design and tasks.

| Milestone | Change                                                                   | Scope                                                                         |
| --------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| M1        | [`add-local-rendering`](openspec/changes/add-local-rendering/)           | Project setup, runtime, Ink renderer for 8 components, `demo`                 |
| M2        | [`add-pane-server`](openspec/changes/add-pane-server/)                   | Sessions, socket protocol, `serve`, `send`, `ask`, `close`                    |
| M3        | [`add-host-adapters`](openspec/changes/add-host-adapters/)               | Host adapters (tmux, TOML, external programs), `open`, `hosts`, configuration |
| M4        | [`add-express-and-mcp`](openspec/changes/add-express-and-mcp/)           | Express input, `compile`, MCP server, `doctor`                                |
| M5        | [`extend-catalog-and-hosts`](openspec/changes/extend-catalog-and-hosts/) | Remaining components, Zellij, WezTerm, kitty, npm release                     |

## Contributing

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven development.

1. Read the change you want to work on: `openspec show <change>`.
2. Implement its tasks in order and tick them off in `tasks.md`.
3. Run `openspec validate <change> --strict` before you open a pull request.
4. After merge, a maintainer archives the change with `openspec archive <change>`, which moves its specs into `openspec/specs/`.

New features start as a new change: `openspec new change <name>`.
