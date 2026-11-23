# widget-board Specification

## Purpose
Shows the widgets of all agents on one scrollable board in the terminal, each with an id that agents use to change it later.

## Requirements

### Requirement: Every surface is a widget
The renderer SHALL show every surface as a widget on one board, all at the same time, in board order.

#### Scenario: Two agents
- **WHEN** one agent adds a progress widget and another agent adds a chart widget
- **THEN** the board shows both widgets at the same time

### Requirement: Widget ids
The board SHALL assign each widget created with `add` the id `w<n>`, with `n` counting up from 1 for the lifetime of the renderer, and SHALL never reuse an id. The widget id SHALL be the A2UI surface id of the widget.

#### Scenario: Removed id is not reused
- **WHEN** the board created `w1` and `w2` and `w2` was removed
- **THEN** the next widget gets the id `w3`

#### Scenario: Action of a widget
- **WHEN** the user presses a Button in widget `w3`
- **THEN** the action has the `surfaceId` `w3`

### Requirement: Surfaces from plain messages
A surface created with a plain `a2ui` message SHALL become a widget whose id is its surface id, with width 12 and no owner. The renderer SHALL reject a plain `createSurface` whose surface id has the form `w` followed by digits.

#### Scenario: M2 client
- **WHEN** a client runs `a2ui-term send examples/confirm.jsonl`, which creates the surface `confirm`
- **THEN** the board shows a widget with the id `confirm` at full width

#### Scenario: Reserved id
- **WHEN** a plain `createSurface` message uses the surface id `w9`
- **THEN** the renderer rejects it with a `render` error that says the id is reserved

### Requirement: Grid layout
The board SHALL lay out widgets in a 12-column grid, from left to right in board order, and SHALL start a new row when the next widget does not fit. A widget SHALL be as high as its content, and a row as high as its highest widget. Below 80 terminal columns, every widget SHALL take the full width.

#### Scenario: Two half-width widgets
- **WHEN** the board has two widgets of width 6 in a terminal with 120 columns
- **THEN** both widgets share one row

#### Scenario: Narrow terminal
- **WHEN** the board has two widgets of width 6 in a terminal with 60 columns
- **THEN** each widget takes its own row at full width

### Requirement: Stable order
New widgets SHALL go to the end of the board order. Changes to a widget's components or data SHALL NOT change the board order.

#### Scenario: Update keeps the position
- **WHEN** widgets `w1`, `w2` and `w3` are shown and an agent updates `w1`
- **THEN** the order stays `w1`, `w2`, `w3`

### Requirement: Scrolling
The board SHALL scroll vertically when its content is higher than the terminal: `PageUp` and `PageDown` by one page, `Home` and `End` to the top and the bottom, and `Up` and `Down` by one line while no text input has focus. Moving the focus with `Tab` SHALL scroll the focused component into view. A content change SHALL keep the scroll offset unless the offset would pass the new end.

#### Scenario: Scroll to the end
- **WHEN** the board content is 120 rows high in a 40-row terminal and the user presses `End`
- **THEN** the last row of the content is the last visible row above the status line

#### Scenario: Update below the view
- **WHEN** the user scrolled to the top and an agent updates a widget at the bottom
- **THEN** the scroll offset does not change

### Requirement: Widget frame
Each widget SHALL have a border whose top line shows the widget title when set, the label when set, and the widget id.

#### Scenario: Frame text
- **WHEN** an agent with label `api-agent` adds a widget with title `Build` and gets the id `w3`
- **THEN** the top border line of the widget shows `Build`, `api-agent` and `w3`

### Requirement: Owner and label
`add` SHALL record an owner from `--owner`, then `A2UI_TERM_OWNER`, then `<host>:<pane id>` of the caller, for example `tmux:%3`, else no owner, and a label from `--label`, then `A2UI_TERM_LABEL`, then the owner.

The host pane SHALL come from the first set variable of `TMUX_PANE` (host `tmux`), `ZELLIJ_PANE_ID` (`zellij`), `WEZTERM_PANE` (`wezterm`) and `KITTY_WINDOW_ID` (`kitty`), the same table that M2 uses for host detection.

#### Scenario: Owner from tmux
- **WHEN** an agent in tmux pane `%3` runs `a2ui-term add progress.jsonl` without `--owner`
- **THEN** the widget's owner is `tmux:%3`

#### Scenario: Owner from WezTerm
- **WHEN** an agent runs outside tmux in WezTerm pane 12 and runs `a2ui-term add progress.jsonl`
- **THEN** the widget's owner is `wezterm:12`

#### Scenario: tmux inside WezTerm
- **WHEN** `TMUX_PANE=%3` and `WEZTERM_PANE=12` are both set
- **THEN** the widget's owner is `tmux:%3`

#### Scenario: No known host
- **WHEN** no host variable and no `A2UI_TERM_OWNER` is set and `add` runs without `--owner`
- **THEN** the widget has no owner, and `remove --mine` and `list --mine` exit with code 1 and say that no owner is known

### Requirement: Empty board
The board SHALL show a short hint with the `add` command when it has no widgets.

#### Scenario: Start
- **WHEN** `serve` starts and no client sent anything
- **THEN** the board shows the hint

### Requirement: Ended widgets
Every 2 seconds, the board SHALL check the owner pane of each widget through the adapter that the owner's host prefix names, and SHALL skip owners without such an adapter, without the owner check, or without the installed host program. Widgets of a missing or dead owner pane SHALL show a dimmed frame with the tag `ended`, SHALL have `"ended": true` in `list`, and SHALL stay ended and on the board.

#### Scenario: Agent pane closes
- **WHEN** the agent in tmux pane `%3` owns widget `w1` and the user closes pane `%3`
- **THEN** within 3 seconds `w1` shows the tag `ended` and stays on the board

#### Scenario: Owner of another host
- **WHEN** widget `w2` has the owner `wezterm:12` and the board runs with only the tmux adapter
- **THEN** the board does not check `w2` and never marks it as ended

### Requirement: Remove ended widgets
`a2ui-term remove --ended` SHALL remove all ended widgets and print their ids. It SHALL fail with exit code 1 when widget ids or `--mine` are given too.

#### Scenario: Clean up
- **WHEN** `w1` and `w4` are ended and the user runs `a2ui-term remove --ended`
- **THEN** both widgets are removed and stdout is `{"removed":["w1","w4"]}`

### Requirement: Label from tmux
When `--label` and `A2UI_TERM_LABEL` are not set and the host supports labels, `add` SHALL use the host label of the caller pane, for tmux the window name and pane index.

#### Scenario: Window name
- **WHEN** an agent in pane 1 of the tmux window `api` adds a widget
- **THEN** the widget frame shows the label `api:1`
