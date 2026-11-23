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
For placement `split`, the tmux adapter SHALL run `tmux split-window -d`, `-h` for `right` or `-v` for `down`, `-l <size>%`, `-t <caller pane>`, `-P -F #{pane_id}`, followed by the renderer command as separate arguments. For placement `window`, it SHALL run `tmux new-window -d -n a2ui -P -F #{pane_id}` followed by the renderer command. It SHALL use the trimmed stdout as the pane id.

#### Scenario: Board to the right
- **WHEN** the adapter opens a split to the right of `%3` with size 40
- **THEN** it runs `tmux split-window -d -h -l 40% -t %3 -P -F #{pane_id}` followed by the renderer arguments

#### Scenario: Board window
- **WHEN** the adapter opens the board with placement `window`
- **THEN** it runs `tmux new-window -d -n a2ui -P -F #{pane_id}` followed by the renderer arguments

### Requirement: Check, label and close commands
The tmux adapter SHALL check whether a pane exists with `tmux display-message -p -t <pane> #{pane_id}`, SHALL read a label with `tmux display-message -p -t <pane> #{window_name}:#{pane_index}`, and SHALL close a pane with `tmux kill-pane -t <pane>`.

#### Scenario: Pane is gone
- **WHEN** `tmux display-message -p -t %7 #{pane_id}` exits with a non-zero code
- **THEN** the adapter reports that pane `%7` does not exist

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
