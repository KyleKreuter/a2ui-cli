# Spec Delta

## Purpose

Teaches coding agents to use the board through the shell, without an MCP server and without reading the source.

## ADDED Requirements

### Requirement: Guide command
`a2ui-term guide` SHALL print a Markdown reference for agents to stdout, with the commands and their exit codes, the A2UI message rules a2ui-term enforces, every supported component with its properties, and examples for a progress widget, a question and a multi-step flow. The output SHALL be at most 12 KB.

#### Scenario: Read the guide
- **WHEN** an agent runs `a2ui-term guide`
- **THEN** stdout lists every component of the renderer registry and no other component
- **AND** stdout is at most 12 KB

#### Scenario: Examples are valid
- **WHEN** the test suite sends every JSON example of the guide to a renderer
- **THEN** the renderer accepts all of them

### Requirement: Agent Skill
The repository SHALL ship `skills/a2ui-term/SKILL.md` in the Agent Skills format, with a description that tells an agent when to use the board and instructions that start with `a2ui-term guide`.

#### Scenario: Skill metadata
- **WHEN** a test reads `skills/a2ui-term/SKILL.md`
- **THEN** its front matter holds `name: a2ui-term` and a non-empty `description`

### Requirement: Agent setup documentation
`docs/agents.md` SHALL describe for Claude Code, Codex and GitHub Copilot CLI how to install the skill or add an instruction snippet, the tool time limit and how to stay below it, and the sandbox settings that allow access to tmux and the runtime directory, each with the date of the last check.

#### Scenario: Timeout advice
- **WHEN** a reader looks up Claude Code in `docs/agents.md`
- **THEN** the page names the Bash tool time limit and shows `ask --timeout` with `events --wait` as the follow-up
