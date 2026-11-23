# Spec Delta

## ADDED Requirements

### Requirement: Mouse check
In tmux, `doctor` SHALL report the `mouse` option of the caller pane as `ok` when it is on and as `warn` with the command `tmux set -g mouse on` when it is off.

#### Scenario: Mouse off
- **WHEN** tmux has `mouse` off and the user runs `a2ui-term doctor`
- **THEN** the mouse check is `warn` and shows `tmux set -g mouse on`
