# Spec Delta

## ADDED Requirements

### Requirement: Action sequence numbers and owner
Every `action` server message SHALL carry the integer field `seq`, the number the renderer assigned to the action, and the field `owner` with the owner of the widget, or `null` for a widget without owner.

#### Scenario: Broadcast with seq
- **WHEN** the user triggers the first action after the renderer started, on a widget of owner `tmux:%3`
- **THEN** every connected client receives an `action` with `"seq": 1` and `"owner": "tmux:%3"`

### Requirement: History request
The socket protocol SHALL accept `{"type":"history","id":<string>,"after":<integer>}`. The server SHALL answer the sender with `{"type":"history","id","actions":[...],"last":<integer>}`, where `actions` holds the kept actions with `seq > after` in order and `last` is the highest assigned `seq`, or 0.

#### Scenario: History of a new renderer
- **WHEN** a client sends `{"type":"history","id":"h","after":0}` before any action
- **THEN** it receives `{"type":"history","id":"h","actions":[],"last":0}`

### Requirement: Widget removal broadcast
When widgets leave the board for any reason, the server SHALL send `{"type":"widgetsRemoved","widgetIds":[...]}` to all clients.

#### Scenario: Remove
- **WHEN** a client removes `w1` and `w4`
- **THEN** every connected client receives `{"type":"widgetsRemoved","widgetIds":["w1","w4"]}`
