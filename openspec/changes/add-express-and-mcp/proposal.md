# Proposal

## Why

Coding agents pay for every token they write. A2UI JSON is verbose, while A2UI Express describes the same UI in a fraction of the tokens, and the official `@a2ui/agent` SDK compiles it. Agents also need a native way to call a2ui-term: an MCP server lets Copilot CLI, Claude Code, Codex and other MCP clients show UI and wait for the user's answer as tool calls.

## What Changes

- Add Express input: `a2ui-term compile`, `--express` for `send` and `ask`, and automatic Express detection for `.a2ui` files.
- Compile Express against the live state of the session renderer, so that Express updates to existing surfaces work, and reject invalid Express without changing the pane.
- Extend the socket protocol with an `express` client message and a `compiled` reply.
- Restrict the components accepted in Express to the components the terminal renderer supports.
- Add `a2ui-term mcp`, an MCP server over stdio with the tools `show_ui`, `ask_user`, `update_data` and `close_ui`, and an `a2ui_guide` prompt and resource.
- Add `a2ui-term doctor` for environment diagnostics.
- Add Express examples: `form.a2ui`, `confirm.a2ui`, `progress.a2ui`.
- Document MCP setup for Claude Code, GitHub Copilot CLI and Codex.

## Out of scope

- Streaming Express compilation. Tool calls deliver complete text.
- MCP transports other than stdio.
- Express input for the `demo` command beyond what `compile` provides (`a2ui-term compile x.a2ui | a2ui-term demo` covers it).

## Capabilities

### New Capabilities

- `express-compilation`: compiling Express to A2UI 1.0 messages, error reporting, the supported component set, and Express input for the CLI.
- `mcp-server`: the MCP server, its tools, parameters, results and guide.
- `diagnostics`: the `doctor` command.

### Modified Capabilities

- `socket-protocol`: adds the `express` client message and the `compiled` reply. Existing messages do not change.

## Impact

- New modules: `src/a2ui/express.ts`, `src/a2ui/validate.ts`, `src/mcp/`, `src/commands/{compile,mcp,doctor}.ts`.
- `src/server/` handles the new `express` message; `src/client/` gains `sendExpress`.
- New runtime dependencies: `@a2ui/agent` (pinned to `0.1.0`), `@modelcontextprotocol/sdk`.
