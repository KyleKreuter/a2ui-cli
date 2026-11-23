# Spec Delta

## Purpose

Gives users, agents and issue reporters one command that shows whether the environment can run the board and what is missing.

## ADDED Requirements

### Requirement: Doctor report
`a2ui-term doctor [--json]` SHALL report the Node.js version, Unix socket support of the platform, the runtime directory and its permission check, the resolved session id and its source, the host detection result, whether a renderer answers for the session, and the versions of a2ui-term, `@a2ui/web_core` and the A2UI protocol. Each check SHALL be marked `ok`, `warn` or `fail`.

#### Scenario: Healthy environment
- **WHEN** the user runs `a2ui-term doctor` inside tmux with Node.js 22 and a running board
- **THEN** every check is `ok` and the host is `tmux`
- **AND** the command exits with code 0

#### Scenario: Node.js too old
- **WHEN** the user runs `a2ui-term doctor` with Node.js 20
- **THEN** the Node.js check is `fail` and names the required version
- **AND** the command exits with code 1

#### Scenario: Outside tmux
- **WHEN** the user runs `a2ui-term doctor` outside any host
- **THEN** the host check is `warn` and says that the board must be started with `serve`

#### Scenario: Machine-readable output
- **WHEN** the user runs `a2ui-term doctor --json`
- **THEN** stdout is one JSON document with one entry per check
