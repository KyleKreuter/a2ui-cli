# Spec Delta

## Purpose

Lets the user decide where widgets appear on the board and remove widgets that are no longer useful, with the mouse or with the keyboard.

## ADDED Requirements

### Requirement: Drag to move
A press on the title line of a widget followed by a move of at least one cell SHALL start a drag. During the drag, the board SHALL show an insertion marker at the target position and SHALL highlight the dragged widget. The release SHALL move the widget to the target. `Esc` or a release on the status line SHALL cancel the drag.

#### Scenario: Move to the front
- **WHEN** the board shows `w1`, `w2` and `w3` and the user drags the title line of `w3` onto the left half of `w1`
- **THEN** the order is `w3`, `w1`, `w2`

#### Scenario: Cancel
- **WHEN** the user drags `w3` and presses `Esc` before the release
- **THEN** the order stays `w1`, `w2`, `w3`

### Requirement: Scroll while dragging
While a drag is on and the pointer is in the first or last visible row of the board, the board SHALL scroll in that direction by one row every 50 milliseconds, within the scroll limits.

#### Scenario: Drag to a widget below the view
- **WHEN** the user drags a widget and holds the pointer in the last visible row for one second
- **THEN** the board scrolls down by about 20 rows and the insertion marker follows the pointer

### Requirement: Updates during a drag
Widget updates during a drag SHALL NOT change the board order, and the insertion marker SHALL follow the new layout.

#### Scenario: Agent updates while the user drags
- **WHEN** the user drags `w3` and an agent adds three rows to `w1`
- **THEN** the order is unchanged until the release and the marker stays at the widget under the pointer

### Requirement: Close mark
The title line of every widget SHALL end with the close mark `[×]`. A click on it SHALL remove the widget in the same way as `a2ui-term remove`.

#### Scenario: Close a widget
- **WHEN** `ask` waits on `w5` and the user clicks the close mark of `w5`
- **THEN** `w5` leaves the board, every client receives `widgetsRemoved` with `w5`, and `ask` exits with code 3

### Requirement: Keyboard move mode
While no text input has focus, `m` SHALL start move mode on the widget that holds the focus, or else on the first visible widget. In move mode, `Tab` and `Shift+Tab` SHALL select another widget, `Left` or `Up` SHALL move the selected widget one position earlier, `Right` or `Down` one position later, `x` SHALL remove it, `Enter` or `m` SHALL end move mode, and `Esc` SHALL restore the order from before move mode started. The status line SHALL show these keys while move mode is on.

#### Scenario: Move with the keyboard
- **WHEN** the board shows `w1`, `w2` and `w3`, the focus is in `w3`, and the user presses `m`, `Up`, `Up` and `Enter`
- **THEN** the order is `w3`, `w1`, `w2`

#### Scenario: Restore
- **WHEN** the user presses `m`, `Up` and `Esc`
- **THEN** the order is the same as before `m`

#### Scenario: Text input has focus
- **WHEN** a TextField has focus and the user types `m`
- **THEN** the TextField receives `m` and move mode stays off
