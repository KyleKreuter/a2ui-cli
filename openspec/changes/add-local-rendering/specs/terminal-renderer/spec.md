# Spec Delta

## Purpose

Defines how A2UI surfaces and basic catalog components appear in a terminal and how the user operates them with the keyboard.

## ADDED Requirements

### Requirement: Text rendering
The renderer SHALL render a Text component as terminal text. Heading variants `h1` to `h5` SHALL render bold, and the `caption` variant SHALL render dimmed.

#### Scenario: Heading text
- **WHEN** a Text component has the variant `h2` and the text `Sign up`
- **THEN** the terminal shows `Sign up` in bold

#### Scenario: Caption text
- **WHEN** a Text component has the variant `caption`
- **THEN** the terminal shows its text dimmed

### Requirement: Layout containers
The renderer SHALL lay out Row children horizontally and Column children vertically, in the order of the `children` list, and SHALL apply the `justify` and `align` properties.

#### Scenario: Row with two children
- **WHEN** a Row has the children `a` and `b`
- **THEN** `a` appears to the left of `b` on the same line

#### Scenario: Column with two children
- **WHEN** a Column has the children `a` and `b`
- **THEN** `a` appears above `b`

### Requirement: Card and Divider
The renderer SHALL draw a Card as a bordered box around its child, and a Divider as a horizontal line across the width of its container.

#### Scenario: Card around a column
- **WHEN** a Card has a Column as its child
- **THEN** the Column appears inside a rounded border

#### Scenario: Divider width follows the terminal
- **WHEN** the terminal is resized from 80 to 60 columns
- **THEN** a Divider in a full-width Column is redrawn 60 columns wide

### Requirement: Keyboard focus
Interactive components (Button, TextField, CheckBox) SHALL be focusable. `Tab` SHALL move focus to the next interactive component and `Shift+Tab` to the previous one, in tree order. The focused component SHALL be visibly marked.

#### Scenario: Move focus forward
- **WHEN** a surface shows a TextField followed by a Button and the TextField has focus
- **AND** the user presses `Tab`
- **THEN** the Button has focus and is visibly marked

#### Scenario: First component gets focus
- **WHEN** a surface with at least one interactive component is rendered
- **THEN** the first interactive component has focus

### Requirement: Button activation
A focused Button SHALL trigger its action when the user presses `Enter` or `Space`.

#### Scenario: Press a button
- **WHEN** a Button with the action `confirm` has focus and the user presses `Enter`
- **THEN** the runtime emits an action event with name `confirm`

### Requirement: Text input
A focused TextField SHALL accept typed characters, `Backspace`, and cursor movement, and SHALL show its label. The `obscured` variant SHALL mask the typed characters. The v0.9 TextField has no placeholder property, so the renderer shows none.

#### Scenario: Type into a field
- **WHEN** an empty TextField has focus and the user types `abc`
- **THEN** the field shows `abc`

#### Scenario: Obscured field
- **WHEN** a TextField with the variant `obscured` receives `secret`
- **THEN** the field shows six mask characters and not `secret`

### Requirement: Checkbox toggle
A focused CheckBox SHALL toggle its bound boolean value when the user presses `Space`, and SHALL show its checked state.

#### Scenario: Toggle a checkbox
- **WHEN** an unchecked CheckBox has focus and the user presses `Space`
- **THEN** the CheckBox shows as checked and its bound value is `true`

### Requirement: Validation checks
The renderer SHALL apply the `checks` of a component as resolved by `web_core`. A Button whose checks fail SHALL render dimmed and SHALL NOT trigger its action. A TextField whose checks fail SHALL show the check messages after the user has edited it.

#### Scenario: Button with a failing check
- **WHEN** a Button has a `required` check on `/name` and `/name` is empty
- **AND** the Button has focus and the user presses `Enter`
- **THEN** the runtime emits no action event

#### Scenario: TextField with a failing check
- **WHEN** a TextField has a `required` check with the message `Name is required`
- **AND** the user types a character and deletes it again
- **THEN** the terminal shows `Name is required` below the field

### Requirement: Unsupported components
The renderer SHALL render a component type it does not support as a visible placeholder `[unsupported: <type>]` and SHALL keep rendering the rest of the surface.

#### Scenario: Unknown component in a column
- **WHEN** a Column contains a component of type `Chart`
- **THEN** the terminal shows `[unsupported: Chart]` in its place
- **AND** the other children of the Column are rendered

### Requirement: Empty state
The renderer SHALL show a waiting message while no surface exists.

#### Scenario: No surface yet
- **WHEN** the renderer starts and has received no message
- **THEN** the terminal shows `Waiting for UI…`

### Requirement: Multiple surfaces
The renderer SHALL show one surface at a time and a tab bar with all surface ids when more than one surface exists. `Ctrl+Left` and `Ctrl+Right` SHALL switch between surfaces.

#### Scenario: Switch surfaces
- **WHEN** the surfaces `a` and `b` exist and `a` is shown
- **AND** the user presses `Ctrl+Right`
- **THEN** surface `b` is shown

#### Scenario: Deleted surface
- **WHEN** the shown surface is deleted by a `deleteSurface` message
- **THEN** the renderer shows the next remaining surface, or the empty state if none remains
