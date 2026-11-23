# Tasks

## 1. Focus

- [ ] 1.1 Replace Ink's `useFocus` with the tree-path focus registry and focus scopes, and verify that all M1 focus tests pass and a new test covers the "component added above the focused one" scenario

## 2. Components

- [ ] 2.1 Implement List (vertical, horizontal, template children) and verify tests for three items and an added fourth item
- [ ] 2.2 Implement Tabs and Modal (overlay with focus scope and `Esc`) and verify input tests for tab switching and opening and closing a modal
- [ ] 2.3 Implement Slider and verify input tests for step change and both bounds
- [ ] 2.4 Implement ChoicePicker (single and multiple selection, after checking `ink-select-input` with Ink 8) and verify input tests for both variants and the bound values
- [ ] 2.5 Implement DateTimeInput and verify tests for valid and invalid date, time and date-time input
- [ ] 2.6 Implement Icon and the media placeholders and verify snapshot tests for a known icon, an unknown icon and each media kind
- [ ] 2.7 Verify by test that `supportedComponents()` lists all 18 basic catalog components and that the MCP guide contains each of their signatures; add an example per new component under `examples/`

## 3. Frame

- [ ] 3.1 Implement the help overlay and verify a snapshot test that lists every key binding
- [ ] 3.2 Implement theme focus colors and verify tests for 24-bit, 256-color and no-color terminals

## 4. Hosts

- [ ] 4.1 Verify the Zellij command against its documentation, add `zellij.toml`, and verify `FakeRunner` snapshots for both directions
- [ ] 4.2 Verify the WezTerm command, add `wezterm.toml`, and verify `FakeRunner` snapshots and pane id capture
- [ ] 4.3 Verify the kitty command and the remote control requirement, add `kitty.toml` or a built-in adapter, and verify `FakeRunner` snapshots and the unusable reason when remote control is off
- [ ] 4.4 Document the new hosts in `docs/hosts.md` and verify the docs list the detection variable and priority of every bundled adapter

## 5. Release

- [ ] 5.1 Set `files` in `package.json`, copy the TOML defaults into `dist/hosts/defaults/`, and verify `npm pack --dry-run` matches the `release` spec
- [ ] 5.2 Add `CHANGELOG.md` and the tag-triggered release workflow with the tag and changelog checks, and verify both checks fail on a test tag with a wrong version
- [ ] 5.3 Document a Homebrew formula in `docs/install.md` and verify it installs the package from npm in a clean environment

## 6. Integration

- [ ] 6.1 Run the manual checklist in Zellij, WezTerm and kitty: `ask examples/confirm.a2ui` opens a pane and returns the answer. Record the results in the pull request
