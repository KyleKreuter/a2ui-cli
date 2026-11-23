# socket-protocol Specification

## Purpose
Defines the local message format between a2ui-term clients and the renderer, so that the CLI and third-party tools can drive a renderer.

## Requirements

### Requirement: Framing
Both directions SHALL use JSON Lines over a Unix domain socket: one UTF-8 encoded JSON object per line, terminated by `\n`. Each object SHALL have a string field `type`.

#### Scenario: Two messages in one write
- **WHEN** a client writes two complete JSON lines in one write call
- **THEN** the server handles both messages in order

#### Scenario: Message split across writes
- **WHEN** a client writes one JSON line in two parts
- **THEN** the server handles one complete message after the second part arrives

### Requirement: Client messages
The server SHALL accept these client messages: `{"type":"a2ui","message":<A2UI message>}`, `{"type":"clear"}` (remove all surfaces), `{"type":"focus"}` (request focus for the pane), `{"type":"close"}` (stop the server) and `{"type":"ping","id":<string>}`.

#### Scenario: Ping
- **WHEN** a client sends `{"type":"ping","id":"abc"}`
- **THEN** the server answers that client with `{"type":"pong","id":"abc"}`

#### Scenario: Clear
- **WHEN** two surfaces exist and a client sends `{"type":"clear"}`
- **THEN** the renderer shows the empty state

### Requirement: Ready message
The server SHALL send `{"type":"ready","version":<tool version>,"a2uiSpec":"1.0"}` to each client as the first message after the connection opens.

#### Scenario: New connection
- **WHEN** a client connects
- **THEN** its first received line is a `ready` message with the tool version and `a2uiSpec` `1.0`

### Requirement: Action broadcast
The server SHALL send every user action as `{"type":"action","surfaceId","name","sourceComponentId","timestamp","context","userMessage"?,"dataModel"?}` to all connected clients. `userMessage` SHALL be present only when the action defines one, and `dataModel` only when the surface requests it.

#### Scenario: Two clients connected
- **WHEN** two clients are connected and the user presses a Button
- **THEN** both clients receive the same `action` message

### Requirement: Error reporting
The server SHALL answer an invalid line or a rejected A2UI message with `{"type":"error","message","source"}`, where `source` is `protocol`, `parse` or `render`, and SHALL keep the connection open.

#### Scenario: Invalid JSON
- **WHEN** a client sends the line `{not json`
- **THEN** the client receives an `error` with `source` `parse`
- **AND** a later valid `ping` from the same client gets a `pong`

#### Scenario: Unknown message type
- **WHEN** a client sends `{"type":"dance"}`
- **THEN** the client receives an `error` with `source` `protocol`

#### Scenario: Rejected A2UI message
- **WHEN** a client sends an `a2ui` message that fails A2UI validation
- **THEN** the client receives an `error` with `source` `render` and the validation message

### Requirement: Closed notification
The server SHALL send `{"type":"closed","reason"}` to all clients before it stops. `reason` SHALL be `user` when the user quit the renderer, `client` when a client sent `close`, and `error` when the server stops because of a fatal error.

#### Scenario: User quits
- **WHEN** a client is connected and the user presses `q` in the renderer
- **THEN** the client receives `{"type":"closed","reason":"user"}` and the connection ends

### Requirement: Line size limit
The server SHALL reject a line longer than 4 MiB with an `error` of `source` `protocol` and SHALL close that connection.

#### Scenario: Oversized line
- **WHEN** a client sends 5 MiB without a newline
- **THEN** the client receives an `error` and the server closes the connection
- **AND** other clients stay connected

### Requirement: Widget messages
The socket protocol SHALL accept the client messages `add` (`id`, `messages`, optional `width`, `title`, `owner`, `label`), `update` (`id`, `widgetId`, `messages`), `remove` (`id` and either `widgetIds` or `owner`) and `list` (`id`). The server SHALL answer the sender with `added` (`id`, `widgetId`), `updated` (`id`), `removed` (`id`, `widgetIds`) and `widgets` (`id`, `widgets`), or with an `error` that carries the same `id`.

#### Scenario: Add over the socket
- **WHEN** a client sends `{"type":"add","id":"a1","messages":[<createSurface>],"width":12}`
- **THEN** it receives `{"type":"added","id":"a1","widgetId":"w1"}`

#### Scenario: Error with request id
- **WHEN** a client sends `{"type":"update","id":"u1","widgetId":"w9","messages":[]}` and `w9` does not exist
- **THEN** it receives an `error` with `"id":"u1"` that names `w9`
