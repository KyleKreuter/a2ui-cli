# Spec Delta

## ADDED Requirements

### Requirement: Host detection order
The launcher SHALL try the host adapters in the order tmux, Zellij, WezTerm, kitty, and SHALL use the first usable one. Without a usable host, the reason of every adapter SHALL appear in the message.

#### Scenario: tmux inside WezTerm
- **WHEN** tmux runs inside WezTerm and an agent in a tmux pane runs `a2ui-term open`
- **THEN** the board opens as a tmux pane

#### Scenario: Zellij inside kitty
- **WHEN** Zellij runs inside kitty and an agent in a Zellij pane runs `a2ui-term open`
- **THEN** the board opens as a Zellij pane
