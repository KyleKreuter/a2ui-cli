# Proposal

## Why

After the widget board, the tmux launcher, the agent workflow, mouse arrangement, the full basic catalog and charts, a2ui-term covers its main use: one live board next to coding agents in tmux. Users should get it with `npx a2ui-term` instead of cloning the repository. A public release also needs a license, a changelog and a reproducible build that users can trace back to a commit.

## What Changes

- Add a license file and the license field in `package.json`.
- Limit the package contents with `files` in `package.json`.
- Add `CHANGELOG.md` and a release workflow that publishes from Git tags with npm provenance.
- Define the versioning rules for the command-line interface, the socket protocol and the exit codes.
- Switch the README install section to npm.

## Out of scope

- Hosts other than tmux (`add-more-hosts`).
- A Homebrew formula and other package managers.
- Windows support for sessions.

## Capabilities

### New Capabilities

- `release`: versioning, package contents, provenance and the changelog.

### Modified Capabilities

None.

## Impact

- New files: `LICENSE`, `CHANGELOG.md`, `.github/workflows/release.yml`.
- `package.json` gains `files`, `license`, `repository` and `publishConfig`.
