# pane-server Specification

## Purpose
Runs the renderer as a long-lived process in its own terminal that clients drive through the session socket.

## Requirements

### Requirement: Serve a session
`a2ui-term serve [--session <id>]` SHALL listen on the session socket, render A2UI messages that clients send, and report user actions to clients as defined by the socket protocol.

#### Scenario: Render a message from a client
- **WHEN** `serve --session t` runs and a client sends an `a2ui` message that creates a surface
- **THEN** the renderer shows the surface

### Requirement: Single renderer per session
`serve` SHALL exit with code 1 and an error when another renderer already answers on the session socket.

#### Scenario: Second serve for the same session
- **WHEN** `serve --session t` runs and the user starts `serve --session t` again
- **THEN** the second process exits with code 1 and the first keeps running

### Requirement: Alternate screen
`serve` SHALL render in the terminal's alternate screen and SHALL restore the previous screen content and a visible cursor when it stops, including on `SIGINT`, `SIGTERM`, `SIGHUP` and uncaught errors.

#### Scenario: Stop with SIGTERM
- **WHEN** `serve` receives `SIGTERM`
- **THEN** the terminal shows its previous content with a visible cursor
- **AND** connected clients receive `closed`

### Requirement: Cleanup on stop
`serve` SHALL remove its socket and state file when it stops for any reason other than `SIGKILL`.

#### Scenario: User quits
- **WHEN** the user presses `q` in the renderer
- **THEN** the session socket and state file no longer exist

### Requirement: Status line
The renderer status line SHALL show the session id, the host name, the number of connected clients and the keys for help and quit.

#### Scenario: Client connects
- **WHEN** no client is connected and a client connects
- **THEN** the status line client count changes from 0 to 1
