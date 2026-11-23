# Spec Delta

## MODIFIED Requirements

### Requirement: Clear before sending
`send` SHALL accept `--clear`. With `--clear`, the command SHALL remove all widgets of the board before it sends the input messages, on the same connection, so that the input can create surfaces with ids that already exist. `ask` SHALL NOT accept `--clear`.

#### Scenario: Show the same file twice
- **WHEN** the board shows the widget `confirm` from `examples/confirm.jsonl` and the user runs `a2ui-term send --session t --clear examples/confirm.jsonl`
- **THEN** the board shows `confirm` again and the command exits with code 0

#### Scenario: Without --clear
- **WHEN** the board shows the widget `confirm` and the user runs `a2ui-term send --session t examples/confirm.jsonl`
- **THEN** the command writes the renderer's error message to stderr and exits with code 4

#### Scenario: Clear with empty input
- **WHEN** the user pipes empty input into `a2ui-term send --session t --clear`
- **THEN** the board shows its empty state and the command exits with code 0

#### Scenario: Ask with --clear
- **WHEN** the user runs `a2ui-term ask --clear examples/confirm.jsonl`
- **THEN** the command exits with code 1 and sends nothing

### Requirement: Ask for a user action
`a2ui-term ask [--session <id>] [--timeout <seconds>] [--width <1-12>] [--title <text>] [--label <text>] [--keep] [file|-]` SHALL add the input as a widget with the rules of `add` and a default width of 12, wait for the first action on that widget, write it to stdout as one JSON object that includes `seq`, and remove the widget afterwards. With `--keep`, the widget SHALL stay on the board.

#### Scenario: User submits the form
- **WHEN** the user runs `a2ui-term ask --session t examples/form.jsonl` and presses the submit Button
- **THEN** stdout contains one JSON object with `name` `submit`, the widget id as `surfaceId`, `seq` and the resolved `context`
- **AND** the widget leaves the board and the command exits with code 0

#### Scenario: Another widget is pressed first
- **WHEN** the board shows a progress widget `w1` with a Cancel button, the agent runs `a2ui-term ask examples/confirm.jsonl`, which creates `w2`, and the user presses Cancel and then Yes
- **THEN** `ask` prints the Yes action of `w2`

#### Scenario: Timeout
- **WHEN** the user runs `ask --timeout 2`, the board creates widget `w5`, and no action happens within 2 seconds
- **THEN** the command exits with code 2 and writes nothing to stdout
- **AND** `w5` stays on the board and stderr shows `a2ui-term ask --widget w5 --after <seq>`

#### Scenario: User closes the renderer
- **WHEN** `ask` waits and the user quits the renderer
- **THEN** the command exits with code 3

## ADDED Requirements

### Requirement: Ask on an existing widget
`a2ui-term ask --widget <id> [--after <seq>] [--timeout <seconds>]` SHALL send no message and SHALL return the first action of that widget with a `seq` greater than `--after`, first from the action history, then from new actions. Without `--after`, it SHALL return only actions that happen after the call. It SHALL NOT remove the widget. Input together with `--widget` SHALL be an input error with exit code 4.

#### Scenario: Wait for Cancel
- **WHEN** the board shows progress widget `w1` with a Cancel button and the agent runs `a2ui-term ask --widget w1 --timeout 60`, and the user presses Cancel
- **THEN** `ask` prints the Cancel action and `w1` stays on the board

#### Scenario: Answer after a timeout
- **WHEN** `ask` timed out on `w5` with the hint `--after 12`, the user answers with action 13, and then the agent runs `a2ui-term ask --widget w5 --after 12`
- **THEN** `ask` prints action 13 at once and exits with code 0

### Requirement: Widget removed while asking
When the widget that `ask` waits on leaves the board before an action arrives, `ask` SHALL exit with code 3 and name the widget on stderr.

#### Scenario: Other client removes the widget
- **WHEN** `ask` waits on `w5` and a client runs `a2ui-term remove w5`
- **THEN** `ask` exits with code 3 and stderr names `w5`

### Requirement: Exit code for closed widgets
Exit code `3` SHALL mean that the user closed the renderer or that the widget a command waits on left the board.

#### Scenario: Board cleared
- **WHEN** `ask` waits on `w5` and a client runs `a2ui-term send --clear`
- **THEN** `ask` exits with code 3
