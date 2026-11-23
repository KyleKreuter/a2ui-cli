# Tasks

## 1. WezTerm

- [ ] 1.1 Check the WezTerm commands for open, focus, list, label and close against the current `wezterm cli` documentation and a real WezTerm, and correct `design.md` and `specs/wezterm-host/spec.md`
- [ ] 1.2 Implement `src/hosts/wezterm.ts`, add it to `HOST_ADAPTERS`, and verify `FakeRunner` snapshots for both directions, the window placement, pane id capture, each pane state, the label and close

## 2. kitty

- [ ] 2.1 Check the kitty commands and the remote control requirement against the current kitty documentation and a real kitty, and correct `design.md` and `specs/kitty-host/spec.md`
- [ ] 2.2 Implement `src/hosts/kitty.ts`, add it to `HOST_ADAPTERS`, and verify `FakeRunner` snapshots and detection tests for remote control on and off

## 3. Zellij

- [ ] 3.1 Check which Zellij commands open a pane, report its id, tell whether a pane exists, name it and close it, and correct `design.md` and `specs/zellij-host/spec.md` with the capabilities that follow
- [ ] 3.2 Implement `src/hosts/zellij.ts`, add it to `HOST_ADAPTERS`, and verify `FakeRunner` snapshots and tests for each declared and each missing capability

## 4. Selection and documentation

- [ ] 4.1 Verify selection tests for tmux inside WezTerm, Zellij inside kitty and no usable host with the reason of every adapter
- [ ] 4.2 Document the hosts, their capabilities and the kitty setting in `README.md`, and verify the documented commands in each host

## 5. Integration

- [ ] 5.1 Run the manual checklist in Zellij, WezTerm and kitty: the first `add` opens the board without taking the focus, `ask examples/confirm.jsonl` returns the answer, closing an agent pane marks its widgets as ended where the host has `ownerCheck`, and `close` closes the board pane where the host has `close`. Record the results in the pull request
