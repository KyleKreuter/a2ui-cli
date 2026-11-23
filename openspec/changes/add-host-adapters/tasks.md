# Tasks

## 1. Configuration

- [ ] 1.1 Implement `src/config.ts` (XDG path, zod schema, defaults, `A2UI_TERM_*` overrides, flag merge) and verify unit tests for each `configuration` scenario
- [ ] 1.2 Document the configuration keys and precedence in `docs/configuration.md` and verify the example file in the doc passes validation in a test

## 2. Adapter core

- [ ] 2.1 Add `src/hosts/types.ts` and `src/hosts/runner.ts` (real runner without shell, `FakeRunner`) and verify a test that the real runner passes `x;rm -rf ~` as one literal argument to `printf`
- [ ] 2.2 Implement `src/hosts/registry.ts` (collection order, forced selection, priority and tie-break, `disabled_hosts`, lazy `load()`) and verify tests for nested hosts, a forced unusable host, a disabled host and that a Herdr module is not loaded outside Herdr

## 3. Declarative and external adapters

- [ ] 3.1 Implement `src/hosts/declarative.ts` (zod schema, placeholders, empty-argument removal, `capture` modes) and verify tests for valid files, a file missing `open`, and each capture mode
- [ ] 3.2 Add `src/hosts/defaults/tmux.toml`, bundle it into `dist/`, and verify `FakeRunner` snapshots for open (right/down, focus/no focus), focus and close
- [ ] 3.3 Implement `src/hosts/external.ts` (PATH scan, subcommands, JSON validation, timeouts) and verify tests with a test script in a temporary `PATH` for present, absent, error exit and a hanging `detect`
- [ ] 3.4 Document the TOML format and the external program protocol in `docs/hosts.md` and verify the documented tmux example matches the bundled file

## 4. Built-in adapters

- [ ] 4.1 Implement `src/hosts/builtin/herdr-tui.ts` and verify `FakeRunner` snapshots for split, run (quoted command) and close, and JSON capture from `result.pane.pane_id`
- [ ] 4.2 Confirm the Herdr App terminal variable and the `pane.split` output shape (see design Open Questions), implement `src/hosts/builtin/herdr-app.ts`, and verify `FakeRunner` snapshots for split, focus and close

## 5. Commands

- [ ] 5.1 Implement `src/commands/hosts.ts` (table and `--json`) and verify a snapshot test with a fake environment holding one present, one unusable and one external adapter
- [ ] 5.2 Implement `src/commands/open.ts` and the launcher module (idempotency, renderer argv, 5 s readiness wait, pane close on timeout, state file pane reference, fallbacks) and verify tests with `FakeRunner` and a fake renderer for each `pane-launcher` scenario
- [ ] 5.3 Add automatic launch and `--no-open` to `send` and `ask`, and pane closing to `close`, and verify end-to-end tests with `FakeRunner`
- [ ] 5.4 Document `open`, `hosts` and automatic launch in `README.md` and verify the documented commands run as written

## 6. Integration

- [ ] 6.1 Add an optional CI job that installs tmux and runs `a2ui-term ask examples/confirm.jsonl` in a detached tmux session with a scripted key press, and verify it passes
- [ ] 6.2 Run the manual checklist in tmux, Herdr TUI and Herdr App: `ask examples/confirm.jsonl` opens a pane to the right, returns the answer, and a second call reuses the pane; on a system without a multiplexer `hosts` shows the reasons. Record the results in the pull request
