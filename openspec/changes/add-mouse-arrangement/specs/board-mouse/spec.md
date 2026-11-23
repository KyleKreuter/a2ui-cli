# Spec Delta

## Purpose

Lets the user scroll the board and use its components with the mouse, while the keyboard keeps working.

## ADDED Requirements

### Requirement: Mouse reporting
`serve` SHALL turn on button-event mouse reporting with SGR encoding when it starts, and SHALL turn it off when it exits, also after a signal or an uncaught error.

#### Scenario: Terminal restored
- **WHEN** the renderer runs and receives `SIGTERM`
- **THEN** the terminal receives the sequences that turn mouse reporting off before the process exits

### Requirement: Mouse input filter
The renderer SHALL remove mouse reports from the input before they reach the component key handling, also when a report arrives in two parts, and SHALL pass every other input unchanged.

#### Scenario: Split report
- **WHEN** the terminal sends `ESC [ < 0 ; 5` and then `; 7 M` in a second chunk while a TextField has focus
- **THEN** the TextField receives no characters and the board handles one mouse press at column 5, row 7

#### Scenario: Typing stays intact
- **WHEN** a TextField has focus and the user types `hello`
- **THEN** the TextField shows `hello`

### Requirement: Wheel scrolling
A wheel event SHALL scroll the board by 3 rows in its direction, within the scroll limits.

#### Scenario: Wheel down
- **WHEN** the board content is 120 rows high, the scroll offset is 0, and the user turns the wheel down by one step
- **THEN** the scroll offset is 3

### Requirement: Click
A press and a release on the same cell SHALL be a click. A click on a Button SHALL focus and press it, on a CheckBox SHALL focus and toggle it, on a TextField SHALL focus it. A click on any other cell SHALL change nothing. The cell SHALL be mapped with the current scroll offset.

#### Scenario: Press a button
- **WHEN** the board is scrolled by 10 rows and the user clicks on the label of a Button
- **THEN** the Button's action reaches all clients, as with `Enter`

#### Scenario: Movement is no click
- **WHEN** the user presses on a Button, moves the pointer by two cells and releases
- **THEN** no action happens

### Requirement: Mouse settings
`serve --no-mouse` and `A2UI_TERM_MOUSE=off` SHALL turn mouse reporting off. When the host reports that mouse is off for the board pane, the status line SHALL show the command that turns it on for 10 seconds. The renderer SHALL NOT change host settings.

#### Scenario: tmux mouse off
- **WHEN** tmux has `mouse` off and the board starts
- **THEN** the status line shows `mouse off: tmux set -g mouse on`
- **AND** the tmux option stays off

#### Scenario: Mouse turned off
- **WHEN** the user runs `a2ui-term serve --no-mouse`
- **THEN** the renderer writes no mouse reporting sequence and the keyboard works as before
