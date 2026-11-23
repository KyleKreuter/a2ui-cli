# Spec Delta

## Purpose

Defines how a2ui-term detects kitty, which `kitten @` commands it runs, and what it needs from the kitty configuration.

## ADDED Requirements

### Requirement: kitty detection
The kitty adapter SHALL be usable when `KITTY_WINDOW_ID` is set, `kitten` is on `PATH` and `kitten @ ls` succeeds. It SHALL be the only adapter whose detection starts a process.

#### Scenario: Remote control off
- **WHEN** `KITTY_WINDOW_ID` is set and `kitten @ ls` fails
- **THEN** the kitty adapter is not usable, with the reason that kitty remote control is off and the setting `allow_remote_control` that turns it on

### Requirement: kitty open command
The kitty adapter SHALL open the board with `kitten @ launch --location=vsplit|hsplit --keep-focus --cwd=<working directory>` followed by the renderer arguments, and SHALL use the trimmed stdout as the window id.

#### Scenario: Board to the right
- **WHEN** the adapter opens the board to the right
- **THEN** it runs `kitten @ launch --location=vsplit --keep-focus --cwd=<working directory>` followed by the renderer arguments

### Requirement: kitty window commands
The kitty adapter SHALL read the window state and the label from the JSON of `kitten @ ls`, and SHALL close a window with `kitten @ close-window --match id:<window id>`.

#### Scenario: Window is gone
- **WHEN** the JSON of `kitten @ ls` has no window with id `4`
- **THEN** the adapter reports that window `4` is missing
