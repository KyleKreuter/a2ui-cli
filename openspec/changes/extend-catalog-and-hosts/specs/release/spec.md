# Spec Delta

## Purpose

Defines how a2ui-term versions are made, what a published package contains, and how users can check where a release came from.

## ADDED Requirements

### Requirement: Semantic versioning
a2ui-term SHALL follow Semantic Versioning. Changes to the socket protocol, the MCP tool parameters, the exit codes or the TOML adapter format that break existing clients SHALL increase the major version, or the minor version while the major version is 0.

#### Scenario: Breaking protocol change before 1.0
- **WHEN** a release removes a socket message type in version 0.4.x
- **THEN** the next version is 0.5.0 and the changelog names the removed message

### Requirement: Package contents
The published npm package SHALL contain the bundled CLI, the bundled host adapter TOML files, the examples, the README, the changelog and the license, and SHALL NOT contain sources, tests or OpenSpec files.

#### Scenario: Inspect the package
- **WHEN** a maintainer runs `npm pack --dry-run`
- **THEN** the file list contains `dist/cli.js` and `dist/hosts/defaults/tmux.toml` and no file under `src/`, `test/` or `openspec/`

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
