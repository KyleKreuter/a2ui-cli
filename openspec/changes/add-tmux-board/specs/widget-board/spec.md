# Spec Delta

## ADDED Requirements

### Requirement: Ended widgets
The board SHALL check every 2 seconds, through the host adapter named by the owner's host prefix, whether the owner pane of each widget still exists, for every owner whose adapter supports the owner check. Owners whose host has no such adapter SHALL be skipped. The board SHALL show the widgets of a missing owner with a dimmed frame and the tag `ended`. The board SHALL NOT remove them by itself. `a2ui-term remove --ended` SHALL remove all ended widgets.

#### Scenario: Agent pane closes
- **WHEN** the agent in tmux pane `%3` owns widget `w1` and the user closes pane `%3`
- **THEN** within 3 seconds `w1` shows the tag `ended` and stays on the board

#### Scenario: Owner of another host
- **WHEN** widget `w2` has the owner `wezterm:12` and the board runs with only the tmux adapter
- **THEN** the board does not check `w2` and never marks it as ended

#### Scenario: Clean up
- **WHEN** `w1` and `w4` are ended and the user runs `a2ui-term remove --ended`
- **THEN** both widgets are removed and stdout is `{"removed":["w1","w4"]}`

### Requirement: Label from tmux
When `--label` and `A2UI_TERM_LABEL` are not set and the host supports labels, `add` SHALL use the host label of the caller pane, for tmux the window name and pane index.

#### Scenario: Window name
- **WHEN** an agent in pane 1 of the tmux window `api` adds a widget
- **THEN** the widget frame shows the label `api:1`
