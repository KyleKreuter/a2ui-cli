# Tasks

## 1. Configuration

- [ ] 1.1 Implement `src/config.ts` (XDG path, zod schema, defaults, `A2UI_TERM_*` overrides, flag merge), switch the placement, direction and size settings from `add-tmux-board` and the mouse setting from `add-mouse-arrangement` to it, and verify unit tests for each `configuration` scenario
- [ ] 1.2 Document the configuration keys and precedence in `docs/configuration.md` and verify that the example file in the doc passes validation in a test

## 2. Registry

- [ ] 2.1 Implement `src/hosts/registry.ts` (collection order, forced selection, priority and tie-break, `disabled_hosts`) and switch the launcher, `close` and the owner check from `HOST_ADAPTERS` to it, and verify tests for two usable hosts, a forced unusable host and a disabled host

## 3. Declarative and external adapters

- [ ] 3.1 Implement `src/hosts/declarative.ts` (zod schema, placeholders, empty-argument removal, capture modes) and verify tests for a valid file, a file without `open`, each capture mode and a user file that replaces a built-in adapter
- [ ] 3.2 Implement `src/hosts/external.ts` (PATH scan, subcommands, JSON validation, timeouts) and verify tests with a test script in a temporary `PATH` for usable, not usable, error exit and a hanging `detect`
- [ ] 3.3 Document the TOML format, the external program protocol and the priority of every built-in adapter in `docs/hosts.md`, and verify that a documented example file loads in a test

## 4. Commands

- [ ] 4.1 Implement `src/commands/hosts.ts` (table and `--json`) and verify a snapshot test with a fake environment that holds one usable, one unusable and one external adapter
- [ ] 4.2 Extend `doctor` with the host and configuration checks and verify a test with an invalid configuration file

## 5. Integration

- [ ] 5.1 Run the manual checklist with a TOML adapter and an external adapter: `hosts` lists both with the expected capabilities, `--host` selects each one, and the first `add` opens the board through it. Record the results in the pull request
