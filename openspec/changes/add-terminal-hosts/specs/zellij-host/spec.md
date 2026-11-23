# Spec Delta

## Purpose

Defines how a2ui-term detects Zellij and which Zellij commands it runs.

## ADDED Requirements

### Requirement: Zellij detection
The Zellij adapter SHALL be usable when `ZELLIJ` and `ZELLIJ_PANE_ID` are set and `zellij` is on `PATH`. Detection SHALL read only environment variables and `PATH`.

#### Scenario: Inside Zellij
- **WHEN** `ZELLIJ` and `ZELLIJ_PANE_ID=7` are set and `zellij` is on `PATH`
- **THEN** the Zellij adapter is usable with the caller pane `7`

### Requirement: Zellij open command
The Zellij adapter SHALL open the board with `zellij run --direction right|down --cwd <working directory> --` followed by the renderer arguments, and the caller pane SHALL keep the focus.

#### Scenario: Board to the right
- **WHEN** the adapter opens the board to the right
- **THEN** it runs `zellij run --direction right --cwd <working directory> --` followed by the renderer arguments

### Requirement: Zellij capabilities
The Zellij adapter SHALL declare `ownerCheck`, `label` and `close` only for the actions that the installed Zellij version supports with a command, as verified in the task of this adapter.

#### Scenario: No pane check
- **WHEN** Zellij has no command that tells whether a pane id exists
- **THEN** the adapter declares `ownerCheck: false` and widgets of Zellij owners never end
