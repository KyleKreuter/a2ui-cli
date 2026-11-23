# Spec Delta

## Purpose

Gives users and issue reporters one command that shows whether the environment can run a2ui-term and which parts are missing.

## ADDED Requirements

### Requirement: Doctor report
`a2ui-term doctor [--json]` SHALL report the Node.js version, the a2ui-term version, the installed `@a2ui/web_core` and `@a2ui/agent` versions, the A2UI protocol version, the selected host adapter, the runtime directory and its permission check, and the configuration file status. Each check SHALL be marked `ok`, `warn` or `fail`.

#### Scenario: Healthy environment
- **WHEN** the user runs `a2ui-term doctor` inside tmux with Node.js 22
- **THEN** every check is `ok` and the selected host is `tmux`
- **AND** the command exits with code 0

#### Scenario: Node.js too old
- **WHEN** the user runs `a2ui-term doctor` with Node.js 20
- **THEN** the Node.js check is `fail` and names the required version
- **AND** the command exits with code 1

#### Scenario: No host
- **WHEN** no host adapter is selected
- **THEN** the host check is `warn` and names the fallback setting
