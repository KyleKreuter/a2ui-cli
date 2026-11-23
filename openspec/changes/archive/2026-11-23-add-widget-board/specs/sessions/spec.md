# Spec Delta

## REMOVED Requirements

### Requirement: Session id resolution
**Reason**: The host pane no longer selects the session, so that agents in different panes share one board. The pane id names the widget owner instead.
**Migration**: Set `--session` or `A2UI_TERM_SESSION` to keep a separate board per pane. The requirement "Shared session id" replaces this one.

## ADDED Requirements

### Requirement: Shared session id
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

## MODIFIED Requirements

### Requirement: Session id format
Session ids SHALL contain only the characters `A-Z`, `a-z`, `0-9`, `-`, `_` and `.`, and SHALL be at most 64 characters long. Commands SHALL reject a session id given by flag or environment that breaks this rule.

#### Scenario: Invalid id from the user
- **WHEN** the user passes `--session ../x`
- **THEN** the command exits with code 1 and an error that names the allowed characters
