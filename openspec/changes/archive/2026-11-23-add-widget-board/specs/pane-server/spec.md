# Spec Delta

## MODIFIED Requirements

### Requirement: Status line
The renderer status line SHALL show the session id, the number of widgets, the number of connected clients, whether content exists above or below the visible part of the board, and the keys for help and quit.

#### Scenario: Client connects
- **WHEN** no client is connected and a client connects
- **THEN** the status line client count changes from 0 to 1

#### Scenario: Content below
- **WHEN** the board content is higher than the terminal and the user is at the top
- **THEN** the status line shows that more content is below
