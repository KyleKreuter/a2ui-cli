# Spec Delta

## MODIFIED Requirements

### Requirement: Session id resolution
Commands SHALL resolve the session id in this order: the `--session` flag, the `A2UI_TERM_SESSION` environment variable, then `default`. The host pane id SHALL NOT change the session id; it is the widget owner instead.

#### Scenario: Flag wins over environment
- **WHEN** `A2UI_TERM_SESSION=env` is set and the user passes `--session flag`
- **THEN** the command uses the session `flag`

#### Scenario: Agents in different panes share the board
- **WHEN** an agent in tmux pane `%3` and an agent in tmux pane `%5` run `a2ui-term add` without session settings
- **THEN** both commands use the session `default`

#### Scenario: No hint available
- **WHEN** neither the flag nor `A2UI_TERM_SESSION` is set
- **THEN** the command uses the session `default`
