# Spec Delta

## Purpose

Turns A2UI Express text into A2UI v0.9 messages for the supported component set, and reports Express errors so that a person or a model can fix them.

## ADDED Requirements

### Requirement: Compile command
`a2ui-term compile [file|-]` SHALL compile Express text from the file or stdin to A2UI v0.9 messages and print them as JSON Lines on stdout, without connecting to a renderer.

#### Scenario: Compile an example
- **WHEN** the user runs `a2ui-term compile examples/form.a2ui`
- **THEN** stdout holds one JSON message per line, starting with `createSurface`
- **AND** the command exits with code 0

#### Scenario: Default surface id
- **WHEN** the Express text has no `surface(...)` statement
- **THEN** the compiled messages use the surface id `main`

### Requirement: Compile errors
On an Express error, a2ui-term SHALL report the error message, the line and column when known, and a hint, SHALL produce no messages, and SHALL exit with code 4.

#### Scenario: Syntax error
- **WHEN** line 3 of the Express text is `foo = )`
- **THEN** stderr names line 3 and the unexpected token
- **AND** stdout is empty and the exit code is 4

### Requirement: Supported component set
Express compilation SHALL accept only components that the terminal renderer supports. An error for another component SHALL list the supported components.

#### Scenario: Component the renderer does not support
- **WHEN** the Express text uses `DateTimeInput` and the renderer does not support it
- **THEN** the error names `DateTimeInput` and lists the supported components

### Requirement: Express input for send and ask
`send` and `ask` SHALL treat the input as Express when `--express` is given or the file name ends in `.a2ui`.

#### Scenario: Ask with an Express file
- **WHEN** the user runs `a2ui-term ask examples/form.a2ui` and submits the form
- **THEN** stdout contains the `submit` action and the exit code is 0

### Requirement: Invalid Express leaves the pane unchanged
For Express input, `send` and `ask` SHALL apply either all compiled messages or none, and SHALL report errors with exit code 4. An input that fails to compile on its own SHALL open no pane.

#### Scenario: Invalid Express with a running renderer
- **WHEN** a renderer shows a form and the user sends Express text with an unknown component
- **THEN** the form stays unchanged and the command exits with code 4

#### Scenario: Invalid Express without a renderer
- **WHEN** no renderer runs and the user sends Express text with a syntax error
- **THEN** no pane opens and the command exits with code 4

### Requirement: Express updates to existing surfaces
Express input that refers to a surface which exists in the session renderer SHALL compile against that surface's current state.

#### Scenario: Progress update
- **WHEN** the renderer shows the surface `progress` bound to `/status` and the user sends `surface("progress")` with `$/status = "60%"`
- **THEN** the renderer shows `60%`
