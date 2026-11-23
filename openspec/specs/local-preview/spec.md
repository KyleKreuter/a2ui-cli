# local-preview Specification

## Purpose
Lets developers render A2UI messages directly in the current terminal, without a socket or a second pane, to try out UI definitions and the renderer.

## Requirements

### Requirement: Render from file or stdin
`a2ui-term demo [file|-]` SHALL read A2UI messages from the given file, or from stdin when the argument is `-` or missing, and SHALL render them in the current terminal.

#### Scenario: Render from stdin
- **WHEN** the user runs `cat examples/form.jsonl | a2ui-term demo`
- **THEN** the terminal shows the form from `examples/form.jsonl`

#### Scenario: Render from a file
- **WHEN** the user runs `a2ui-term demo examples/hello.jsonl`
- **THEN** the terminal shows the surface from `examples/hello.jsonl`

#### Scenario: File not found
- **WHEN** the user runs `a2ui-term demo missing.jsonl`
- **THEN** the command writes an error that names `missing.jsonl` to stderr and exits with code 1

### Requirement: Keyboard input while reading stdin
The demo SHALL accept keyboard input from the controlling terminal when its messages come from stdin.

#### Scenario: Interact after piping messages
- **WHEN** the user pipes `examples/form.jsonl` into `a2ui-term demo` and presses `Tab`
- **THEN** focus moves to the next interactive component

### Requirement: Report actions
The demo SHALL record every action event as one JSON line in the log file and SHALL show the last action in the status line.

#### Scenario: Press the submit button
- **WHEN** the user presses the submit Button in the demo
- **THEN** the log file contains a JSON line with the action name `submit` and its resolved context
- **AND** the status line shows `submit`

### Requirement: Clean exit
The demo SHALL exit when the user presses `q` or `Esc` while no text input has focus, or `Ctrl+C` at any time, and SHALL restore the terminal state on exit.

#### Scenario: Quit with q
- **WHEN** a Button has focus and the user presses `q`
- **THEN** the demo exits with code 0 and the terminal shows the shell prompt with the cursor visible

#### Scenario: q inside a text field
- **WHEN** a TextField has focus and the user presses `q`
- **THEN** the TextField receives the character `q` and the demo keeps running
