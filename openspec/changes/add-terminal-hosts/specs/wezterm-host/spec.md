# Spec Delta

## Purpose

Defines how a2ui-term detects WezTerm and which `wezterm cli` commands it runs.

## ADDED Requirements

### Requirement: WezTerm detection
The WezTerm adapter SHALL be usable when `WEZTERM_PANE` is set and `wezterm` is on `PATH`. Detection SHALL read only environment variables and `PATH`.

#### Scenario: Inside WezTerm
- **WHEN** `WEZTERM_PANE=12` is set and `wezterm` is on `PATH`
- **THEN** the WezTerm adapter is usable with the caller pane `12`

### Requirement: WezTerm open command
The WezTerm adapter SHALL open the board with `wezterm cli split-pane --pane-id <caller pane> --right|--bottom --percent <size> --cwd <working directory> --` followed by the renderer arguments, SHALL use the trimmed stdout as the pane id, and the caller pane SHALL keep the focus.

#### Scenario: Board below
- **WHEN** the adapter opens the board below pane `12` with size 30
- **THEN** it runs `wezterm cli split-pane --pane-id 12 --bottom --percent 30 --cwd <working directory> --` followed by the renderer arguments and stores the printed pane id

### Requirement: WezTerm pane commands
The WezTerm adapter SHALL read the pane state and the label from `wezterm cli list --format json`, and SHALL close a pane with `wezterm cli kill-pane --pane-id <pane>`.

#### Scenario: Pane is gone
- **WHEN** the JSON of `wezterm cli list --format json` has no entry with pane id `12`
- **THEN** the adapter reports that pane `12` is missing
