# Spec Delta

## Purpose

Accepts A2UI messages for one pinned protocol version, applies them to surface state, and turns user interaction into resolved action events.

## ADDED Requirements

### Requirement: Pinned protocol version
The runtime SHALL support exactly one A2UI protocol version, 1.0, together with the 1.0 basic catalog. The supported version SHALL be reported wherever the tool reports its own version.

#### Scenario: Message for the supported version
- **WHEN** the runtime receives a `createSurface` message with `"version": "1.0"`
- **THEN** it creates the surface

#### Scenario: Message for another version
- **WHEN** the runtime receives a message with `"version": "v0.9"`
- **THEN** it rejects the message with an error that names the supported version
- **AND** it leaves existing surfaces unchanged

#### Scenario: Message without a version
- **WHEN** the runtime receives a `deleteSurface` message without a `version` field
- **THEN** it rejects the message with an error that names the supported version

### Requirement: Message input formats
The runtime SHALL accept A2UI messages as JSON Lines (one message per line) and as a single JSON array of messages. Blank lines in JSON Lines input SHALL be ignored.

#### Scenario: JSON Lines input
- **WHEN** the input holds three messages on three lines and one blank line
- **THEN** the runtime applies the three messages in order

#### Scenario: JSON array input
- **WHEN** the input is a JSON array of two messages
- **THEN** the runtime applies both messages in order

#### Scenario: Malformed line
- **WHEN** line 2 of JSON Lines input is not valid JSON
- **THEN** the runtime reports a parse error that names line 2
- **AND** it applies the valid lines before and after it

### Requirement: Invalid messages do not crash the renderer
The runtime SHALL report a message that fails schema or integrity validation as an error and SHALL continue to process later messages.

#### Scenario: Message with a missing required field
- **WHEN** an `updateComponents` message has no `surfaceId`
- **THEN** the runtime reports a validation error
- **AND** a later valid message is applied

### Requirement: Data model updates re-render bound components
The runtime SHALL re-render only components whose bound values change when an `updateDataModel` message arrives.

#### Scenario: Live progress update
- **WHEN** a Text component is bound to `/status` and an `updateDataModel` message sets `/status` to `"50%"`
- **THEN** the rendered text shows `50%` without the surface being re-created

### Requirement: Two-way binding for input components
Input components bound to a data model path SHALL write user input back to that path.

#### Scenario: Text input updates the data model
- **WHEN** a TextField is bound to `/form/name` and the user types `Ada`
- **THEN** the data model value at `/form/name` is `Ada`

### Requirement: Resolved action events
When the user triggers an action, the runtime SHALL emit an action event with the surface id, the action name, the source component id, and the action context with all data bindings resolved to their current values.

#### Scenario: Submit a form
- **WHEN** a Button has the action `submit` with context `{"name": {"@path": "/form/name"}}` and `/form/name` is `Ada`
- **AND** the user presses the Button
- **THEN** the runtime emits an action event with name `submit`, the surface id, the Button's component id, and context `{"name": "Ada"}`

#### Scenario: User message
- **WHEN** a Button's action has the `userMessage` `Submitted`
- **AND** the user presses the Button
- **THEN** the action event contains the user message `Submitted`

#### Scenario: Data model snapshot on request
- **WHEN** the surface was created with `sendDataModel: true` and the user triggers an action
- **THEN** the action event also contains a snapshot of that surface's data model

### Requirement: Renderer function calls
The runtime SHALL answer each `callRendererFunction` message as `web_core` defines it, and SHALL report every outbound message for the agent (`rendererFunctionResponse`, `callAgentFunction`) to its outbound handlers.

#### Scenario: Agent calls a renderer-only function
- **WHEN** the runtime receives a `callRendererFunction` message with the function call id `c1` for the basic catalog function `required`
- **THEN** its outbound handlers receive a `rendererFunctionResponse` message for `c1` with the error code `INVALID_FUNCTION_CALL`
