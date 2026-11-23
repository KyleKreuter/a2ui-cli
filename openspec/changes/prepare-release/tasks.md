# Tasks

## 1. Repository

- [ ] 1.1 Add `LICENSE` with the license the maintainer chose and the matching `license` field in `package.json`, and verify the `release` license scenario
- [ ] 1.2 Push the repository, run the M1 CI workflow on GitHub, fix any failure, and tick M1 task 1.5

## 2. Package

- [ ] 2.1 Set `files`, `repository` and `publishConfig` in `package.json` and verify that `npm pack --dry-run` matches the `release` package contents scenario

## 3. Release

- [ ] 3.1 Add `CHANGELOG.md` and the tag-triggered release workflow with the tag and changelog checks, and verify both checks fail on a test tag with a wrong version
- [ ] 3.2 Switch the README install section to `npx a2ui-term` and `npm install -g a2ui-term`, and verify the commands in a clean environment after the first release
