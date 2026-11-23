# Tasks

## 1. Configuration

- [ ] 1.1 Implement `src/config.ts` (XDG path, zod schema, defaults, `A2UI_TERM_*` overrides, flag merge), switch the placement, direction and size settings from `add-tmux-board` and the mouse setting from `add-mouse-arrangement` to it, and verify unit tests for each `configuration` scenario
- [ ] 1.2 Document the configuration keys and precedence in `docs/configuration.md` and verify that the example file in the doc passes validation in a test

## 2. Registry

- [ ] 2.1 Implement `src/hosts/registry.ts` (collection order, forced selection, priority and tie-break, `disabled_hosts`) and switch the launcher and the owner check to it, and verify tests for two usable hosts, a forced unusable host and a disabled host

## 3. Built-in adapters

- [ ] 3.1 Check the Zellij commands for open, exists, label, close and the mouse setting against its current documentation, implement `src/hosts/zellij.ts`, and verify `FakeRunner` snapshots for both directions and the declared capabilities
- [ ] 3.2 Check the WezTerm commands, implement `src/hosts/wezterm.ts`, and verify `FakeRunner` snapshots and pane id capture
- [ ] 3.3 Check the kitty commands and the remote control requirement, implement `src/hosts/kitty.ts`, and verify `FakeRunner` snapshots and the unusable reason when remote control is off

## 4. Declarative and external adapters

- [ ] 4.1 Implement `src/hosts/declarative.ts` (zod schema, placeholders, empty-argument removal, capture modes) and verify tests for a valid file, a file without `open`, each capture mode and a user file that replaces a built-in adapter
- [ ] 4.2 Implement `src/hosts/external.ts` (PATH scan, subcommands, JSON validation, timeouts) and verify tests with a test script in a temporary `PATH` for usable, not usable, error exit and a hanging `detect`
- [ ] 4.3 Document the TOML format, the external program protocol and every built-in adapter with its detection variables and priority in `docs/hosts.md`, and verify that a documented example file loads in a test

## 5. Commands

- [ ] 5.1 Implement `src/commands/hosts.ts` (table and `--json`) and verify a snapshot test with a fake environment that holds one usable, one unusable and one external adapter
- [ ] 5.2 Extend `doctor` with the host and configuration checks and verify a test with an invalid configuration file

## 6. Integration

- [ ] 6.1 Run the manual checklist in Zellij, WezTerm and kitty: the first `add` opens the board, `ask examples/confirm.jsonl` returns the answer, closing an agent pane marks its widgets as ended where the host has `ownerCheck`, and `hosts` shows the expected capabilities. Record the results in the pull request
