# Spec Delta

## Purpose

Opens the board pane on demand, once per session, so that agents only need to add widgets and read answers.

## ADDED Requirements

### Requirement: Open the board
`a2ui-term open [--session <id>] [--placement split|window] [--direction right|down] [--size <percent>]` SHALL select a usable host, open a pane that runs the renderer for the session, wait until the renderer answers a `ping`, and print `{"session","socket","host","paneId"}` as one JSON line on stdout. The calling pane SHALL keep the focus.

#### Scenario: Open in tmux
- **WHEN** an agent in tmux pane `%3` runs `a2ui-term open`
- **THEN** a pane to the right of `%3` runs the renderer for session `default`
- **AND** pane `%3` stays the active pane

#### Scenario: Own window
- **WHEN** an agent runs `a2ui-term open --placement window`
- **THEN** a new tmux window named `a2ui` runs the renderer and the current window stays active

### Requirement: Open is idempotent
`open` SHALL open no pane when a renderer already answers for the session, also when the caller is in another pane, window or tmux session, and SHALL print the same JSON as for a new pane, with the pane id from the session state file.

#### Scenario: Second agent
- **WHEN** the board runs and an agent in another tmux window runs `a2ui-term open`
- **THEN** no new pane opens and the command exits with code 0

### Requirement: Readiness timeout
`open` SHALL wait at most 5 seconds for the renderer. On timeout it SHALL close the new pane when the host supports `close`, and SHALL exit with code 1 with a message that names the session and the host.

#### Scenario: Renderer does not start
- **WHEN** the opened pane cannot start the renderer
- **THEN** `open` exits with code 1 after at most 5 seconds and the new pane is closed

### Requirement: Renderer command
The board pane SHALL run the renderer with the same Node.js executable, the same Node.js flags and the same a2ui-term entry script as the calling process, so that it also works when a2ui-term runs through `npx`. The renderer SHALL record in the session state file that `open` created its pane.

#### Scenario: Started through npx
- **WHEN** the user runs `npx a2ui-term open`
- **THEN** the board starts the renderer from the same package installation

### Requirement: Automatic launch
`add`, `send` and `ask` SHALL run the `open` logic when no renderer answers for the session, unless `--no-open` is given. Without a usable host or with `--no-open`, they SHALL exit with code 1 with the `serve` command in the message.

#### Scenario: First widget opens the board
- **WHEN** no renderer runs and an agent in tmux runs `a2ui-term add examples/progress.jsonl`
- **THEN** the board pane opens, shows the widget, and the command prints the widget id

#### Scenario: Automatic launch turned off
- **WHEN** no renderer runs and the user runs `a2ui-term add --no-open examples/progress.jsonl`
- **THEN** no pane opens and the command exits with code 1

### Requirement: No focus changes
The launcher and the widget commands SHALL never change the active pane after the board pane exists.

#### Scenario: Add while the user types
- **WHEN** the user types in the agent pane and an agent adds a widget
- **THEN** the agent pane stays active

### Requirement: Close the board
`close` SHALL stop the renderer as in M2 and SHALL then close the board pane through its host when `open` created the pane, the caller runs in the same host server as the renderer, and the pane still exists.

#### Scenario: Pane stays after exit
- **WHEN** tmux has `remain-on-exit` on and the user runs `a2ui-term close`
- **THEN** the renderer stops and the board pane is closed

#### Scenario: Renderer started by the user
- **WHEN** the user started `a2ui-term serve` in a pane and runs `a2ui-term close`
- **THEN** the renderer stops and the pane stays open

#### Scenario: Caller in another tmux server
- **WHEN** the board runs in one tmux server and the user runs `a2ui-term close` in another
- **THEN** the renderer stops and a2ui-term runs no `kill-pane`

### Requirement: Fallback without a host
When no usable host is found, `open` SHALL print the reason and the exact `a2ui-term serve --session <id>` command for another terminal on stderr, and SHALL exit with code 1.

#### Scenario: Outside tmux
- **WHEN** `TMUX` is not set and the user runs `a2ui-term open`
- **THEN** stderr names the missing host and shows `a2ui-term serve --session default`, and the command exits with code 1

### Requirement: Placement settings
Placement, direction and size SHALL come from the flag, then `A2UI_TERM_PLACEMENT`, `A2UI_TERM_DIRECTION` and `A2UI_TERM_SIZE`, then the defaults `split`, `right` and `40`. An invalid value SHALL fail with exit code 1 and name the allowed values.

#### Scenario: Size out of range
- **WHEN** the user runs `a2ui-term open --size 95`
- **THEN** the command exits with code 1 and names the range 10 to 90
