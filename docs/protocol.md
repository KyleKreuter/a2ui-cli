# Socket protocol

`a2ui-term serve` listens on a Unix domain socket. Clients send A2UI messages to it and receive the user's actions. The `send`, `ask`, `close`, `add`, `update`, `set`, `remove` and `list` commands are clients of this protocol. Other tools can use it directly, in any language.

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
3. `default`.

A session id has 1 to 64 of the characters `A-Z`, `a-z`, `0-9`, `-`, `_` and `.`.

The terminal pane does not select the session. All agents on a machine share the board of the session `default`, unless they set another session. The pane gives the owner of a widget instead, see [Owners](#owners).

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

### Widget requests

A widget request has a string `id` that the client chooses, for example a UUID. The server answers the sender with exactly one reply or one `error` with the same `id`. The server handles the lines of one connection in order, so replies arrive in the order of the requests.

| Request                                                                              | Reply                                               |
| ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `{"type":"add","id","messages",["width"],["title"],["owner"],["label"]}`             | `{"type":"added","id","widgetId":"w1"}`             |
| `{"type":"update","id","widgetId","messages"}`                                       | `{"type":"updated","id"}`                           |
| `{"type":"remove","id","widgetIds":["w1","w4"]}` or `{"type":"remove","id","owner"}` | `{"type":"removed","id","widgetIds":["w1","w4"]}`   |
| `{"type":"list","id"}`                                                               | `{"type":"widgets","id","widgets":[<widget>, ...]}` |

- `messages` of `add` holds exactly one `createSurface` and then only `updateComponents` and `updateDataModel` messages for the same surface. The server replaces every `surfaceId` with the new widget id.
- `messages` of `update` holds only `updateComponents` and `updateDataModel` messages. Their `surfaceId` does not matter.
- `width` is a whole number of grid columns from 1 to 12. The default is 6.
- `add` and `update` apply all messages or none. `remove` removes all named widgets or none.
- `remove` with `owner` removes every widget of that owner and can remove none.
- Widget ids are `w<number>`. The server never gives an id to a second widget, also not after `clear`.

A `<widget>` in `widgets` has these fields. `title`, `label` and `owner` are `null` when the widget has none:

```json
{
  "widgetId": "w1",
  "title": "Build",
  "label": "api-agent",
  "owner": "tmux:%3",
  "width": 6,
  "position": 0
}
```

A surface that an `a2ui` message creates is a widget too, with its surface id as widget id, width 12 and no owner. The surface ids `w<number>` are reserved: an `a2ui` message that creates one fails with source `render`.

### Owners

The owner is a string that names the agent of a widget. a2ui-term commands resolve it in this order:

1. The `--owner` flag.
2. The `A2UI_TERM_OWNER` environment variable.
3. The pane of a known host, as `<host>:<pane id>`: `TMUX_PANE` (`tmux:%3`), `ZELLIJ_PANE_ID` (`zellij:7`), `WEZTERM_PANE` (`wezterm:12`) or `KITTY_WINDOW_ID` (`kitty:4`), in this order.

The label is `--label`, then `A2UI_TERM_LABEL`, then the owner. Clients of their own can send any owner and label strings.

## Server messages

| Message                                                        | When                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| `{"type":"ready","version":"0.1.0","a2uiSpec":"1.0"}`          | First message on every connection.                            |
| `{"type":"pong","id":"<id>"}`                                  | Answer to a `ping`, to the sender only.                       |
| `{"type":"error","message":"<text>","source":"<source>"}`      | A line of the sender failed, to the sender only.              |
| `added`, `updated`, `removed`, `widgets`                       | The reply to a widget request, to the sender only.            |
| `{"type":"action","surfaceId","name","sourceComponentId",...}` | The user triggered an action, to all clients.                 |
| `{"type":"closed","reason":"<reason>"}`                        | The renderer stops, to all clients. Then the connection ends. |

`source` of an `error`:

- `parse`: the line is not valid JSON.
- `protocol`: the object is not a valid client message, for example an unknown `type`, or the line is longer than 4 MiB. After a line that is too long, the server closes the connection.
- `render`: the A2UI message failed validation. `message` holds the validation error.
- `widget`: a widget request failed, for example for a widget id that does not exist, or because one of its A2UI messages failed validation.

An `error` for a widget request has the `id` of the request, also when the request is not a valid client message and has source `protocol`.

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
