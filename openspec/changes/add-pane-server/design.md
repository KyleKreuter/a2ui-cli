# Design

## Context

M1 (`add-local-rendering`) provides the runtime wrapper and the Ink renderer. The renderer receives a processor and an action callback and knows nothing about transport. This change adds the transport around it. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- A protocol simple enough for third-party clients in any language: JSON Lines, no handshake beyond `ready`.
- Clients can tell whether their own messages were accepted.

**Non-Goals:**

- Authentication beyond file system permissions.
- Remote (TCP) access.
- Message replay for clients that connect late. A new client sees only future actions.

## Decisions

### Module layout

- `src/protocol/messages.ts`: zod schemas and types for all client and server messages. The `a2ui` payload stays `unknown` at this layer; the runtime validates it.
- `src/protocol/lines.ts`: a line splitter for `net.Socket` streams with the 4 MiB limit. M1's JSONL codec handles file and stdin input.
- `src/session/`: id resolution, paths, directory checks, state file, stale socket detection.
- `src/server/`: `net.Server`, client set, broadcast, dispatch of client messages to the runtime.
- `src/client/`: a small promise-based client (`connect`, `send`, `confirm`, `waitForAction`), reused by `send`, `ask`, `close`, and by the MCP server in M4.

### Acknowledgement through ping ordering

The server handles the lines of one connection strictly in order and sends errors only to the client whose line caused them. A client confirms its messages by sending a `ping` after them: when the `pong` arrives, every earlier message was handled, and any `error` that arrived before the `pong` belongs to those messages. This needs no new message type.

Alternative: an `id` on every `a2ui` message and an `ack` reply. Rejected: more protocol surface for the same guarantee.

### Errors go to the sender, actions go to everyone

Errors concern one client's input. Actions concern every client that waits for the user. `ask` therefore ignores actions that arrive before its own `pong`, so an earlier click does not answer a later question.

### Stale socket detection

A socket file is live when a connection succeeds and a `ping` gets a `pong` within 500 ms. `ECONNREFUSED` or `ENOENT` means stale. Any other result is an error, and the command does not delete the file.

### Session ids derived from host panes

The derived id is `<host>-<pane id>` with characters outside `[A-Za-z0-9._-]` replaced by `_`, for example `tmux-_3` for `TMUX_PANE=%3`. The derivation lives in `src/session/` as a table of environment variables, so host adapters do not need to load for it.

### Terminal handling in serve

`serve` writes `\x1b[?1049h` before Ink starts and `\x1b[?1049l\x1b[?25h` on exit. One `shutdown(reason)` function sends `closed`, unmounts Ink, restores the terminal and removes files. `SIGINT`, `SIGTERM`, `SIGHUP`, `uncaughtException` and the quit key call it. It runs at most once.

### Exit codes

Exit codes are constants in `src/commands/exit-codes.ts`. Code `4` covers input errors of every kind, including Express compile errors added in M4.

## Risks / Trade-offs

- [Unix domain socket paths are limited to about 104 bytes on macOS] → The id limit of 64 characters keeps `<runtime dir>/<id>.sock` short for typical `XDG_RUNTIME_DIR` and macOS `tmpdir` paths. `serve` checks the final path length and reports a clear error.
- [macOS `os.tmpdir()` is per user (`/var/folders/...`), Linux `/tmp` is shared] → The `-<uid>` suffix and the owner and mode check prevent other users from planting a socket.
- [A client that never reads blocks broadcast writes] → The server drops a client whose write buffer exceeds 4 MiB.
