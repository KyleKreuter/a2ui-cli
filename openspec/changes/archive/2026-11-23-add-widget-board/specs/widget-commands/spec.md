# Spec Delta

## Purpose

Lets agents and scripts create, change and remove widgets on the board with one shell command each, referring to widgets by the id the board returned.

## ADDED Requirements

### Requirement: Add a widget
`a2ui-term add [file|-] [--width <1-12>] [--title <text>] [--owner <id>] [--label <text>]` SHALL read A2UI messages with exactly one `createSurface`, send them to the board, and print `{"widgetId":"<id>"}` as one JSON line on stdout after the board accepted all of them. The surface id in the input SHALL be replaced by the widget id. The default width SHALL be 6.

#### Scenario: Add a progress widget
- **WHEN** an agent runs `a2ui-term add --title Build examples/progress.jsonl`
- **THEN** the board shows the widget with the title `Build`
- **AND** stdout is `{"widgetId":"w1"}` and the command exits with code 0

#### Scenario: No createSurface
- **WHEN** the input holds only `updateDataModel` messages
- **THEN** the command exits with code 4 and says that `add` needs exactly one `createSurface`

### Requirement: All or nothing
The board SHALL apply the messages of one `add` or `update` either all or none. On a rejected message, the command SHALL exit with code 4 and the board SHALL look as before.

#### Scenario: Invalid component in the second message
- **WHEN** an `add` input holds a valid `createSurface` and an `updateComponents` message with a component that fails validation, for example a `Text` without `text`
- **THEN** no widget is created and the command exits with code 4

### Requirement: Update a widget
`a2ui-term update <widgetId> [file|-]` SHALL apply `updateComponents` and `updateDataModel` messages to the widget, with their `surfaceId` replaced by the widget id. `createSurface` and `deleteSurface` messages SHALL be input errors with exit code 4.

#### Scenario: Replace components
- **WHEN** an agent runs `a2ui-term update w1 done.jsonl` with an `updateComponents` message
- **THEN** widget `w1` shows the new components at the same position

### Requirement: Set values
`a2ui-term set <widgetId> <path> <value> [<path> <value>]...` SHALL send one `updateDataModel` per pair, with each value parsed as JSON. With `--text`, every value SHALL be taken as a literal string. `set <widgetId> --delete <path>` SHALL send an `updateDataModel` without `value`. An invalid JSON value or path SHALL be an input error with exit code 4, and nothing SHALL be sent.

#### Scenario: Update progress
- **WHEN** widget `w1` binds a Text to `/percent` and the agent runs `a2ui-term set w1 /percent '"60%"'`
- **THEN** the widget shows `60%`

#### Scenario: Unquoted text
- **WHEN** the agent runs `a2ui-term set w1 /step --text Compiling`
- **THEN** the value at `/step` is the string `Compiling`

#### Scenario: Invalid JSON value
- **WHEN** the agent runs `a2ui-term set w1 /percent 60%`
- **THEN** stderr names the value and suggests `--text`, and the command exits with code 4

### Requirement: Remove widgets
`a2ui-term remove <widgetId>...` SHALL remove the named widgets. `a2ui-term remove --mine` SHALL remove every widget whose owner is the caller's owner. Both SHALL print `{"removed":[...]}` with the removed ids.

#### Scenario: Remove own widgets
- **WHEN** the agent in pane `%3` owns `w1` and `w4`, another agent owns `w2`, and the agent in `%3` runs `a2ui-term remove --mine`
- **THEN** `w1` and `w4` are removed, `w2` stays, and stdout is `{"removed":["w1","w4"]}`

### Requirement: Unknown widget
`update`, `set` and `remove` with a widget id that the board does not know SHALL exit with code 4 and name the id.

#### Scenario: Stale id
- **WHEN** widget `w2` was removed and an agent runs `a2ui-term set w2 /x 1`
- **THEN** the command exits with code 4 and says that `w2` does not exist

### Requirement: List widgets
`a2ui-term list [--mine]` SHALL print one JSON document with every widget, or every widget of the caller's owner, with `widgetId`, `title`, `label`, `owner`, `width` and `position`.

#### Scenario: List
- **WHEN** the board holds `w1` and `w2` and the agent runs `a2ui-term list`
- **THEN** stdout holds both widgets in board order

### Requirement: Widget commands need a running board
`update`, `set`, `remove` and `list` SHALL NOT start a renderer. Without a running renderer they SHALL exit with code 1 and name the session.

#### Scenario: No board
- **WHEN** no renderer runs and the agent runs `a2ui-term set w1 /x 1`
- **THEN** the command exits with code 1
