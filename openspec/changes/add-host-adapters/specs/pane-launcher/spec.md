# Spec Delta

## Purpose

Opens a renderer pane for a session next to the caller on demand, so that scripts and agents only need to send UI and wait for answers.

## ADDED Requirements

### Requirement: Open a pane
`a2ui-term open [--session <id>] [--direction right|down] [--host <name>] [--focus]` SHALL select a host adapter, open a pane that runs `serve` for the session, wait until the renderer answers a `ping`, and print `{"session","socket","host","paneId"}` as JSON on stdout.

#### Scenario: Open in tmux
- **WHEN** the user runs `a2ui-term open --session t` inside tmux
- **THEN** a tmux pane to the right runs the renderer for session `t`
- **AND** stdout contains the session, the socket path, `tmux` and the tmux pane id

### Requirement: Open is idempotent
`open` SHALL open no pane when a renderer already answers for the session, and SHALL print the same JSON as for a new pane.

#### Scenario: Second open
- **WHEN** a renderer runs for session `t` and the user runs `a2ui-term open --session t`
- **THEN** no new pane opens and the command exits with code 0

### Requirement: Readiness timeout
`open` SHALL wait at most 5 seconds for the renderer. On timeout it SHALL close the pane when the adapter supports `close`, and SHALL exit with code 1.

#### Scenario: Renderer does not start
- **WHEN** the opened pane cannot start the renderer
- **THEN** `open` exits with code 1 after at most 5 seconds and names the session and host

### Requirement: Renderer command
The pane SHALL run the renderer with the same Node.js executable and the same a2ui-term entry script as the calling process, so that it also works when a2ui-term runs through `npx`.

#### Scenario: Started through npx
- **WHEN** the user runs `npx a2ui-term open`
- **THEN** the pane starts the renderer from the same package installation

### Requirement: Automatic launch
`send` and `ask` SHALL run the `open` logic when no renderer answers for the session, unless `--no-open` is given.

#### Scenario: Ask without a running renderer
- **WHEN** no renderer runs and the user runs `a2ui-term ask examples/confirm.jsonl` inside tmux
- **THEN** a pane opens, shows the confirmation, and the command returns the user's action

#### Scenario: Automatic launch turned off
- **WHEN** no renderer runs and the user runs `a2ui-term send --no-open examples/hello.jsonl`
- **THEN** no pane opens and the command exits with code 1

### Requirement: Fallback without a host
When no adapter is selected, `open` SHALL act according to the `fallback` setting: `hint` prints the `serve` command to run in another terminal and exits with code 1; `foreground` runs the renderer in the current terminal; `new-window` opens a new terminal window on macOS through `open -a Terminal`.

#### Scenario: Hint fallback
- **WHEN** no host is detected and `fallback` is `hint`
- **THEN** stderr shows the exact `a2ui-term serve --session <id>` command and the command exits with code 1

### Requirement: Pane reference is stored
The launcher SHALL store the host name and pane id in the session state file, and `close` SHALL use them to close the pane when the adapter supports `close`.

#### Scenario: Close closes the pane
- **WHEN** session `t` runs in a tmux pane and the user runs `a2ui-term close --session t`
- **THEN** the renderer stops and the tmux pane is closed
