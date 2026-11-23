# Design

## Context

The CI workflow from M1 runs lint, type checks, tests and the build, but has not run on GitHub yet, because nothing is pushed (M1 task 1.5). See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- A user can verify that a published version comes from a tagged commit of this repository.
- The package holds only what runs.

**Non-Goals:**

- Automatic version bumps or generated changelogs.

## Decisions

### License

The maintainer chooses the license before task 1.1. The A2UI packages that a2ui-term depends on use Apache-2.0, which makes Apache-2.0 the default proposal; MIT is the common alternative for CLI tools.

### Release workflow

GitHub Actions publishes on tags `v*` with `npm publish --provenance`. A check step compares the tag with `package.json` and looks for the version heading in `CHANGELOG.md`. The workflow runs the full CI job before publishing.

### Package contents

`files` lists `dist/`, `catalogs/`, `skills/`, `examples/`, `README.md`, `CHANGELOG.md` and `LICENSE`. The skill ships in the package so that `docs/agents.md` can point to a path inside the installed package.

## Risks / Trade-offs

- [The first push runs CI on GitHub for the first time and can fail on platform differences] → Task 1.2 pushes and fixes CI before any release step.
