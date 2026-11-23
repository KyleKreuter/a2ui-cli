# Proposal

## Why

The `demo` command renders UI in the terminal that runs it, so the caller cannot keep working or read the user's answer. A long-running renderer in its own terminal, driven over a local socket, lets scripts and agents show UI and wait for the user's action from another process.

## What Changes

- Add a session model: each session has one Unix domain socket and one state file in a private runtime directory.
- Add a JSON Lines socket protocol between clients and the renderer, validated on both sides.
- Add `a2ui-term serve`, which opens the session socket and renders incoming A2UI messages with the terminal renderer from M1.
- Add `a2ui-term send`, `a2ui-term ask` and `a2ui-term close` as socket clients, with defined exit codes.
- Show session id and client count in the renderer status line.

## Out of scope

- Opening a pane automatically. In this milestone the user starts `serve` in a second terminal by hand (M4, `add-tmux-board`).
- A2UI Express input.
- Windows named pipes. The socket transport targets macOS and Linux.

## Capabilities

### New Capabilities

- `sessions`: session id resolution, socket and state file locations, permissions and cleanup.
- `socket-protocol`: the client/server message format, validation, broadcast and error reporting.
- `pane-server`: the `serve` command, its lifecycle and its terminal handling.
- `pane-client`: the `send`, `ask` and `close` commands, their input handling and exit codes.

### Modified Capabilities

None.

## Impact

- New modules: `src/session/`, `src/protocol/`, `src/server/`, `src/client/`, `src/commands/{serve,send,ask,close}.ts`.
- New runtime dependency: `zod`.
- The renderer status line gains session and client information; the renderer itself stays socket-agnostic.
