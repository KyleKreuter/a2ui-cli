# Spec Delta

## Purpose

Lets scripts send A2UI messages to a running renderer and wait for the user's answer from the shell, with exit codes that scripts can branch on.

## ADDED Requirements

### Requirement: Send messages
`a2ui-term send [--session <id>] [file|-]` SHALL read A2UI messages as JSON Lines or as a JSON array from the file or from stdin, send them to the session renderer, and exit with code 0 after the renderer accepted all of them.

#### Scenario: Send a form
- **WHEN** a renderer runs for session `t` and the user runs `a2ui-term send --session t examples/form.jsonl`
- **THEN** the renderer shows the form and the command exits with code 0

#### Scenario: Renderer rejects a message
- **WHEN** one of the sent messages fails A2UI validation
- **THEN** the command writes the renderer's error message to stderr and exits with code 4

### Requirement: Input is validated before sending
`send` and `ask` SHALL parse the whole input before they send anything, and SHALL send nothing when the input is not valid JSON Lines or a JSON array.

#### Scenario: Malformed input
- **WHEN** line 3 of the input is not valid JSON
- **THEN** the command writes an error that names line 3 to stderr, sends nothing, and exits with code 4

### Requirement: Clear before sending
`send` and `ask` SHALL accept `--clear`. With `--clear`, the command SHALL remove all surfaces of the renderer before it sends the input messages, on the same connection, so that the input can create surfaces with ids that already exist.

#### Scenario: Show the same file twice
- **WHEN** the renderer for session `t` shows the surface `confirm` from `examples/confirm.jsonl` and the user runs `a2ui-term ask --session t --clear examples/confirm.jsonl`
- **THEN** the renderer shows `confirm` again and the command waits for an action

#### Scenario: Without --clear
- **WHEN** the renderer for session `t` shows the surface `confirm` and the user runs `a2ui-term send --session t examples/confirm.jsonl`
- **THEN** the command writes the renderer's error message to stderr and exits with code 4

#### Scenario: Clear with empty input
- **WHEN** the user pipes empty input into `a2ui-term send --session t --clear`
- **THEN** the renderer shows the empty state and the command exits with code 0

### Requirement: Ask for a user action
`a2ui-term ask [--session <id>] [--timeout <seconds>] [file|-]` SHALL send the messages like `send`, then wait for the next action event from the renderer and write it to stdout as one JSON object.

#### Scenario: User submits the form
- **WHEN** the user runs `a2ui-term ask --session t examples/form.jsonl` and presses the submit Button
- **THEN** stdout contains one JSON object with `name` `submit`, `surfaceId` and the resolved `context`
- **AND** the command exits with code 0

#### Scenario: Timeout
- **WHEN** the user runs `ask --timeout 2` and no action happens within 2 seconds
- **THEN** the command exits with code 2 and writes nothing to stdout

#### Scenario: User closes the renderer
- **WHEN** `ask` waits and the user quits the renderer
- **THEN** the command exits with code 3

### Requirement: Exit codes
`send`, `ask` and `close` SHALL use these exit codes: `0` success, `1` error (for example, no renderer reachable or invalid flags), `2` timeout, `3` renderer closed by the user, `4` input parse or validation error.

#### Scenario: No renderer reachable
- **WHEN** no renderer runs for session `t` and no automatic launch is available
- **THEN** `send --session t` writes an error that names the session to stderr and exits with code 1

### Requirement: Close a session
`a2ui-term close [--session <id>]` SHALL stop the session renderer and exit with code 0. It SHALL also exit with code 0 when no renderer runs for the session.

#### Scenario: Close a running session
- **WHEN** a renderer runs for session `t` and the user runs `a2ui-term close --session t`
- **THEN** the renderer stops and the command exits with code 0
