# Spec Delta

## ADDED Requirements

### Requirement: Mouse option command
The tmux adapter SHALL read the mouse setting of a pane with `tmux show-options -Av -t <pane> mouse` and SHALL report it as on for the output `on` and as off for every other output.

#### Scenario: Mouse inherited off
- **WHEN** the global tmux option `mouse` is off and the board pane has no own value
- **THEN** the adapter reports mouse as off for the board pane
