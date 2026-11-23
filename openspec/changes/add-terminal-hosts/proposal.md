# Proposal

## Why

`add-tmux-board` opens the board in tmux only, but many users run their agents in Zellij, WezTerm or kitty. Owner ids for these hosts exist since `add-widget-board`, and the `HostAdapter` interface from `add-tmux-board` takes a new host as one adapter file and one entry in `src/hosts/select.ts`. This change adds the three hosts as soon as tmux works, before the larger `add-more-hosts`.

## What Changes

- Add built-in adapters for Zellij, WezTerm and kitty behind the `HostAdapter` interface.
- Detect the hosts in the order tmux, Zellij, WezTerm, kitty, so that a multiplexer inside a terminal emulator gets the board.
- Each adapter declares the capabilities its host supports. Without `ownerCheck`, widgets of a closed agent pane never end; without `close`, `close` leaves the pane to the host.
- `open`, the automatic launch, `close`, the owner check and the label work in each host as far as its capabilities allow.

## Out of scope

- TOML and external adapters, host priorities, `--host`, the `hosts` command and the configuration file (`add-more-hosts`).
- Owners from two different hosts on one board. The board checks owners with the adapter that the owner prefix names, through the host server of the renderer.
- Floating panes, tabs and new terminal windows.

## Capabilities

### New Capabilities

- `zellij-host`: detection of Zellij and the exact Zellij commands.
- `wezterm-host`: detection of WezTerm and the exact `wezterm cli` commands.
- `kitty-host`: detection of kitty, the remote control requirement and the exact `kitten @` commands.

### Modified Capabilities

- `pane-launcher`: adds the detection order of the hosts.

## Impact

- New modules: `src/hosts/zellij.ts`, `src/hosts/wezterm.ts`, `src/hosts/kitty.ts`, each with tests.
- `HOST_ADAPTERS` in `src/hosts/select.ts` gains three entries. The launcher, `close` and the owner check do not change.
- No new runtime dependencies. Each host stays a runtime-only dependency.
