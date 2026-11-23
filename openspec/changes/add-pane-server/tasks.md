# Tasks

## 1. Sessions

- [x] 1.1 Implement session id resolution and validation in `src/session/id.ts` and verify unit tests for flag, environment, each derived host variable, `default` and the invalid-id error
- [x] 1.2 Implement runtime directory resolution and the owner and mode check in `src/session/paths.ts` and verify tests in a temporary directory for creation with `0700`, a `0777` directory and the socket path length check
- [x] 1.3 Implement the state file and stale socket detection in `src/session/state.ts` and verify tests for a live socket, a refused socket and a missing socket

## 2. Protocol

- [x] 2.1 Implement zod schemas for all client and server messages in `src/protocol/messages.ts` and verify unit tests accept each documented message and reject unknown types
- [x] 2.2 Implement the stream line splitter with the 4 MiB limit in `src/protocol/lines.ts` and verify tests for split writes, multiple lines per write and an oversized line

## 3. Server

- [x] 3.1 Implement `src/server/` (listen, `ready`, per-connection ordered handling, errors to the sender, action broadcast, `clear`, `close`, write-buffer limit) and verify integration tests with two real socket clients against a server with a fake renderer
- [x] 3.2 Implement `src/commands/serve.ts` (single renderer check, alternate screen, one-time shutdown on quit key and signals, file cleanup, status line with session, host and client count) and verify an integration test that starts `serve` with a fake stdout, sends `close` and finds no socket or state file afterwards

## 4. Client commands

- [x] 4.1 Implement `src/client/` with `connect`, `send`, `confirm` (ping ordering) and `waitForAction` and verify unit tests against an in-process server
- [x] 4.2 Implement `send`, `ask` (with `--timeout`) and `close` with the exit codes from `src/commands/exit-codes.ts` and verify end-to-end tests for success, renderer error (4), malformed input (4), timeout (2), user close (3) and no renderer (1)
- [x] 4.3 Document `serve`, `send`, `ask`, `close`, the exit codes and the socket protocol in `README.md` and `docs/protocol.md`, and verify the documented two-terminal example runs as written

## 5. Acceptance

- [x] 5.1 Start `a2ui-term serve --session t` in one terminal, run `a2ui-term ask --session t examples/form.jsonl` in another, submit the form, and verify the action JSON appears on stdout with exit code 0
