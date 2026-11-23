# Spec Delta

## Purpose

Defines how a2ui-term versions are made, what a published package contains, and how users can check where a release came from.

## ADDED Requirements

### Requirement: Semantic versioning
a2ui-term SHALL follow Semantic Versioning. Changes to the command-line flags, the JSON output of commands, the socket protocol or the exit codes that break existing callers SHALL increase the major version, or the minor version while the major version is 0.

#### Scenario: Breaking protocol change before 1.0
- **WHEN** a release removes a socket message type in version 0.4.x
- **THEN** the next version is 0.5.0 and the changelog names the removed message

### Requirement: Package contents
The published npm package SHALL contain the bundled CLI, the terminal catalog definition, the Agent Skill, the examples, the README, the changelog and the license, and SHALL NOT contain sources, tests or OpenSpec files.

#### Scenario: Inspect the package
- **WHEN** a maintainer runs `npm pack --dry-run`
- **THEN** the file list contains `dist/cli.js`, `catalogs/v1_0/terminal.json` and `skills/a2ui-term/SKILL.md`
- **AND** it contains no file under `src/`, `test/` or `openspec/`

### Requirement: License
The repository and the package SHALL contain a `LICENSE` file, and `package.json` SHALL name the same license.

#### Scenario: License field
- **WHEN** a maintainer runs `npm pack --dry-run`
- **THEN** the file list contains `LICENSE` and the `license` field of `package.json` names its license

### Requirement: Provenance
Releases SHALL be published from CI with npm provenance, from a Git tag `v<version>` that matches the package version.

#### Scenario: Tag does not match
- **WHEN** the tag `v0.2.0` is pushed while `package.json` holds `0.1.9`
- **THEN** the release workflow fails before publishing

### Requirement: Changelog
Every release SHALL have a changelog entry with the version, the date and the user-visible changes.

#### Scenario: Release without an entry
- **WHEN** the release workflow runs for a version with no changelog entry
- **THEN** the workflow fails before publishing
