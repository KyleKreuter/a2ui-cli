# Spec Delta

## Purpose

Defines how a2ui-term detects tmux and which tmux commands it runs, so that the board behavior is predictable and testable without tmux.

## ADDED Requirements

### Requirement: No install-time host dependency
a2ui-term SHALL run every command that opens no pane on a system without tmux, and SHALL call tmux only through the `tmux` program at runtime.

#### Scenario: System without tmux
- **WHEN** `tmux` is not on `PATH` and a renderer runs
- **THEN** `a2ui-term add --no-open` works as in `add-widget-board`

### Requirement: Detection without side effects
The tmux adapter SHALL be usable when `TMUX` and `TMUX_PANE` are set and `tmux` is on `PATH`. Detection SHALL read only environment variables and `PATH`, and SHALL start no process.

#### Scenario: Inside tmux
- **WHEN** `TMUX` and `TMUX_PANE=%3` are set and `tmux` is on `PATH`
- **THEN** the tmux adapter is usable with the caller pane `%3`

#### Scenario: Variable set but program missing
- **WHEN** `TMUX` is set and `tmux` is not on `PATH`
- **THEN** the tmux adapter is not usable, with the reason that `tmux` is not on `PATH`

### Requirement: Open commands
For placement `split`, the tmux adapter SHALL run `tmux split-window -d`, `-h` for `right` or `-v` for `down`, `-l <size>%`, `-t <caller pane>`, the pane setup arguments and `-P -F #{pane_id}`, followed by the renderer command as separate arguments. For placement `window`, it SHALL run `tmux new-window -d -n a2ui`, the pane setup arguments and `-P -F #{pane_id}`, followed by the renderer command. It SHALL use the trimmed stdout as the pane id.

#### Scenario: Board to the right
- **WHEN** the adapter opens a split to the right of `%3` with size 40
- **THEN** it runs `tmux split-window -d -h -l 40% -t %3 -c <working directory> -P -F #{pane_id}` followed by the renderer arguments

#### Scenario: Board window
- **WHEN** the adapter opens the board with placement `window`
- **THEN** it runs `tmux new-window -d -n a2ui -c <working directory> -P -F #{pane_id}` followed by the renderer arguments

### Requirement: Pane setup
The pane setup arguments SHALL be `-c <working directory of the caller>` and one `-e NAME=VALUE` for each of `XDG_RUNTIME_DIR` and `TMPDIR` that the caller has set, because a new pane gets the environment of the tmux server.

#### Scenario: Runtime directory in the new pane
- **WHEN** the caller has `XDG_RUNTIME_DIR=/run/user/1000` and the adapter opens the board
- **THEN** the command contains `-e XDG_RUNTIME_DIR=/run/user/1000` before `-P`

### Requirement: Pane state command
The tmux adapter SHALL read the state of a pane with `tmux display-message -p -t <pane> '#{pane_id} #{pane_dead}'`. It SHALL report the pane as missing when the first field of the output is not the requested pane id or when the command fails with `can't find` in stderr, as dead when `#{pane_dead}` is `1`, as live otherwise, and as unknown on any other failure or a timeout.

#### Scenario: Pane is gone
- **WHEN** tmux 3.8 prints an empty line for `tmux display-message -p -t %7 '#{pane_id} #{pane_dead}'` and exits with 0
- **THEN** the adapter reports that pane `%7` is missing

#### Scenario: Command of the pane exited
- **WHEN** tmux prints `%7 1`
- **THEN** the adapter reports that pane `%7` is dead

#### Scenario: No tmux server
- **WHEN** the command fails with `no server running`
- **THEN** the adapter reports the state of pane `%7` as unknown

### Requirement: Label and close commands
The tmux adapter SHALL read a label with `tmux display-message -p -t <pane> '#{pane_id} #{window_name}:#{pane_index}'` and use the text after the pane id, and SHALL close a pane with `tmux kill-pane -t <pane>`. A `kill-pane` failure for a pane that is missing afterwards SHALL count as success.

#### Scenario: Label of a pane
- **WHEN** tmux prints `%3 api:1` for the label command of pane `%3`
- **THEN** the label is `api:1`

### Requirement: No shell execution
a2ui-term SHALL start every tmux command directly with an argument vector, SHALL never pass it through a shell, and SHALL give the renderer command to tmux as separate arguments.

#### Scenario: Pane id with shell characters
- **WHEN** tmux returns the pane id `x;rm -rf ~`
- **THEN** the close command receives `x;rm -rf ~` as one literal argument

### Requirement: Command timeout
Every tmux command SHALL be stopped after 3 seconds, and the calling a2ui-term command SHALL report the tmux command and its stderr.

#### Scenario: tmux hangs
- **WHEN** `tmux split-window` does not exit within 3 seconds
- **THEN** `open` stops it, exits with code 1 and names the tmux command
