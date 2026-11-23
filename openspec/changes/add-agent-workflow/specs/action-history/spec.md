# Spec Delta

## Purpose

Keeps the user's actions available after the client that showed the widget has stopped, so that an agent can read answers and button presses whenever it is ready.

## ADDED Requirements

### Requirement: Numbered actions
The renderer SHALL number user actions from 1 in broadcast order and SHALL keep the last 500 actions for as long as it runs.

#### Scenario: Two actions
- **WHEN** the user presses two buttons after the renderer started
- **THEN** the actions have `seq` 1 and 2

### Requirement: Read actions
`a2ui-term events [--after <seq>] [--widget <id>]... [--mine]` SHALL print every kept action with a `seq` greater than `--after` (default 0), restricted to the given widgets when `--widget` is given and to the caller's owner when `--mine` is given, as one JSON line each in `seq` order, and SHALL exit with code 0, also when it prints nothing.

#### Scenario: Read after a position
- **WHEN** the history holds actions 1 to 3 and the agent runs `a2ui-term events --after 1`
- **THEN** stdout holds the actions 2 and 3

#### Scenario: Filter by widget
- **WHEN** action 1 belongs to widget `w1` and action 2 to `w2`, and the agent runs `a2ui-term events --widget w1`
- **THEN** stdout holds only action 1

#### Scenario: Only own widgets
- **WHEN** action 1 belongs to a widget of the agent in pane `%3`, action 2 to a widget of another agent, and the agent in `%3` runs `a2ui-term events --mine`
- **THEN** stdout holds only action 1, also when that widget was removed meanwhile

### Requirement: Wait for actions
With `--wait <seconds>`, `events` SHALL wait for the next matching action when none is kept after `--after`, SHALL print it and exit with code 0, or SHALL exit with code 2 after the timeout. It SHALL not miss an action that arrives while it reads the history.

#### Scenario: Answer arrives later
- **WHEN** no action is kept after 3 and the agent runs `a2ui-term events --after 3 --wait 60`, and the user presses a button 5 seconds later
- **THEN** the command prints that action with `seq` 4 and exits with code 0

#### Scenario: No answer
- **WHEN** the agent runs `a2ui-term events --after 3 --wait 1` and the user does nothing
- **THEN** the command exits with code 2 and prints nothing

### Requirement: Dropped actions
When the history no longer holds every action after `--after`, `events` SHALL write the number of dropped actions to stderr.

#### Scenario: Old position
- **WHEN** the renderer assigned 600 actions and the agent runs `a2ui-term events --after 10`
- **THEN** stderr says that 90 actions were dropped and stdout holds actions 101 to 600

### Requirement: Answers survive a stopped ask
An action on a widget that an `ask` created SHALL stay readable with `events` and `ask --widget` after that `ask` stopped by timeout or signal.

#### Scenario: Tool stops ask
- **WHEN** an agent's tool stops `a2ui-term ask examples/confirm.jsonl` while it waits on widget `w5`, and the user answers afterwards
- **THEN** `a2ui-term events --widget w5` prints the answer
