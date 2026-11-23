# Spec Delta

## ADDED Requirements

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
