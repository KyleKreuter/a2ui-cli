# Socket protocol

`a2ui-term serve` listens on a Unix domain socket. Clients send A2UI messages to it and receive the user's actions. The `send`, `ask` and `close` commands are clients of this protocol. Other tools can use it directly, in any language.

The socket transport works on macOS and Linux.

## Socket location

Each session has one socket and one state file:

| File               | Path                                                               |
| ------------------ | ------------------------------------------------------------------ |
| Socket             | `<runtime dir>/<session>.sock`                                     |
| State file         | `<runtime dir>/<session>.json`                                     |
| Runtime dir        | `$XDG_RUNTIME_DIR/a2ui-term/`, if `XDG_RUNTIME_DIR` is set         |
| Runtime dir (else) | `<os tmpdir>/a2ui-term-<uid>/`, for example `/tmp/a2ui-term-1000/` |

The runtime directory has mode `0700`. a2ui-term refuses to use it when it belongs to another user or has broader permissions.

The state file holds the renderer process id, the host name, the pane reference and the creation time:

```json
{ "pid": 4242, "host": "tmux", "paneRef": "%3", "createdAt": "2026-11-23T10:00:00.000Z" }
```

### Session ids

Commands resolve the session id in this order:

1. The `--session` flag.
2. The `A2UI_TERM_SESSION` environment variable.
3. The pane of a known host: `TMUX_PANE`, `ZELLIJ_PANE_ID`, `WEZTERM_PANE` or `KITTY_WINDOW_ID`. The id is `<host>-<pane id>`, for example `tmux-_3` for `TMUX_PANE=%3`.
4. `default`.

A session id has 1 to 64 of the characters `A-Z`, `a-z`, `0-9`, `-`, `_` and `.`. In a derived id, a2ui-term replaces all other characters with `_`.

## Framing

Both directions use JSON Lines: one UTF-8 JSON object per line, terminated by `\n`. Each object has a string field `type`. A line can have at most 4 MiB. Objects can have fields that this document does not list; the receiver ignores them.

## Client messages

| Message                               | Effect                                                     |
| ------------------------------------- | ---------------------------------------------------------- |
| `{"type":"a2ui","message":<message>}` | Applies one A2UI 1.0 message, for example `createSurface`. |
| `{"type":"clear"}`                    | Deletes all surfaces. The renderer shows its empty state.  |
| `{"type":"focus"}`                    | Reserved. The renderer accepts it and does nothing.        |
| `{"type":"close"}`                    | Stops the renderer.                                        |
| `{"type":"ping","id":"<any string>"}` | Asks for a `pong` with the same `id`.                      |

## Server messages

| Message                                                        | When                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| `{"type":"ready","version":"0.1.0","a2uiSpec":"1.0"}`          | First message on every connection.                            |
| `{"type":"pong","id":"<id>"}`                                  | Answer to a `ping`, to the sender only.                       |
| `{"type":"error","message":"<text>","source":"<source>"}`      | A line of the sender failed, to the sender only.              |
| `{"type":"action","surfaceId","name","sourceComponentId",...}` | The user triggered an action, to all clients.                 |
| `{"type":"closed","reason":"<reason>"}`                        | The renderer stops, to all clients. Then the connection ends. |

`source` of an `error`:

- `parse`: the line is not valid JSON.
- `protocol`: the object is not a valid client message, for example an unknown `type`, or the line is longer than 4 MiB. After a line that is too long, the server closes the connection.
- `render`: the A2UI message failed validation. `message` holds the validation error.

An `action` has the fields `surfaceId`, `name`, `sourceComponentId`, `timestamp` and `context`, with all data bindings resolved. It has `userMessage` when the action defines one, and `dataModel` when the surface has `sendDataModel`.

`reason` of `closed`:

- `user`: the user quit the renderer, or the renderer got a signal such as `SIGTERM`.
- `client`: a client sent `close`.
- `error`: the renderer stops because of an error.

## Know whether your messages were accepted

The server handles the lines of one connection in order and sends errors only to the client that sent the line. To confirm your messages, send a `ping` after them:

1. Send the `a2ui` messages.
2. Send `{"type":"ping","id":"x"}`.
3. Read lines until the `pong` with `id` `x` arrives.

Every `error` that arrives before that `pong` belongs to your messages. No error means that the renderer accepted all of them.

Actions go to every connected client. A client that waits for the answer to its own UI ignores the actions that arrive before its `pong`. This is how `ask` works.

## Example session

`>` is a line from the client, `<` is a line from the server:

```text
< {"type":"ready","version":"0.1.0","a2uiSpec":"1.0"}
> {"type":"a2ui","message":{"version":"1.0","createSurface":{"surfaceId":"q","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json","components":[{"id":"root","component":"Button","child":"label","action":{"event":{"name":"ok"}}},{"id":"label","component":"Text","text":"OK"}]}}}
> {"type":"ping","id":"1"}
< {"type":"pong","id":"1"}
< {"type":"action","surfaceId":"q","name":"ok","sourceComponentId":"root","timestamp":"2026-11-23T10:00:05.000Z","context":{}}
```

To try the protocol by hand, connect with a tool that speaks Unix domain sockets, for example `nc -U <socket>` or `socat - UNIX-CONNECT:<socket>`.
