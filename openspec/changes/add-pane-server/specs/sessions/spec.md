# Spec Delta

## Purpose

Identifies which renderer a command talks to, and defines where each session keeps its socket and state file and how they are protected and removed.

## ADDED Requirements

### Requirement: Session id resolution
Commands SHALL resolve the session id in this order: the `--session` flag, the `A2UI_TERM_SESSION` environment variable, an id derived from the host pane id (`HERDR_PANE_ID`, `TMUX_PANE`, `ZELLIJ_PANE_ID`, `WEZTERM_PANE`, `KITTY_WINDOW_ID`), then `default`.

#### Scenario: Flag wins over environment
- **WHEN** `A2UI_TERM_SESSION=env` is set and the user passes `--session flag`
- **THEN** the command uses the session `flag`

#### Scenario: Derived from the tmux pane
- **WHEN** neither the flag nor `A2UI_TERM_SESSION` is set and `TMUX_PANE=%3` is set
- **THEN** the command uses a session id derived from `tmux` and `%3`

#### Scenario: No hint available
- **WHEN** no flag and none of the listed variables are set
- **THEN** the command uses the session `default`

### Requirement: Session id format
Session ids SHALL contain only the characters `A-Z`, `a-z`, `0-9`, `-`, `_` and `.`, and SHALL be at most 64 characters long. Derived ids SHALL replace other characters with `_`. Commands SHALL reject a session id given by flag or environment that breaks this rule.

#### Scenario: Invalid id from the user
- **WHEN** the user passes `--session ../x`
- **THEN** the command exits with code 1 and an error that names the allowed characters

### Requirement: Runtime directory
Socket and state files SHALL live in `$XDG_RUNTIME_DIR/a2ui-term/` when `XDG_RUNTIME_DIR` is set, else in `<os tmpdir>/a2ui-term-<uid>/`. The directory SHALL have mode `0700`. A command SHALL refuse to use the directory when it exists with a different owner or broader permissions.

#### Scenario: Directory is created private
- **WHEN** the runtime directory does not exist and `serve` starts
- **THEN** the directory exists with mode `0700`

#### Scenario: Directory with broad permissions
- **WHEN** the runtime directory exists with mode `0777`
- **THEN** the command exits with code 1 and an error that names the directory

### Requirement: Session state file
While a renderer runs, the file `<session>.json` next to the socket SHALL hold the renderer process id, the host name, the pane reference and the creation time.

#### Scenario: State file while serving
- **WHEN** `serve --session t` runs
- **THEN** `t.json` contains `pid`, `host`, `paneRef` and `createdAt`

### Requirement: Stale session cleanup
A command that finds a socket file without a responding renderer SHALL treat the session as not running and SHALL remove the stale socket and state file before a new renderer binds.

#### Scenario: Renderer was killed
- **WHEN** the renderer of session `t` was killed with `SIGKILL` and `serve --session t` starts
- **THEN** `serve` removes the old socket and state file and listens on a new socket
