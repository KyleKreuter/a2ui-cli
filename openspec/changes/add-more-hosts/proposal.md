# Proposal

## Why

`add-tmux-board` and `add-terminal-hosts` ship built-in adapters for tmux, Zellij, WezTerm and kitty in a fixed detection order. Some users run hosts that a2ui-term does not know, and some want a different host than the first one detected. This change lets users and third parties add hosts without a release, lets users choose the host, and adds a configuration file for host choice and board defaults.

## What Changes

- Replace the fixed detection order with host selection by explicit choice (`--host`, `A2UI_TERM_HOST`) or by detection priority, with the innermost host first.
- Add declarative TOML adapters and external adapter programs named `a2ui-term-host-<name>`.
- Add `a2ui-term hosts` to list adapters, detection results and reasons.
- Add the configuration file `~/.config/a2ui-term/config.toml` with the precedence flag > environment > file > default.
- `doctor` reports the selected host and the configuration file status.

## Out of scope

- Herdr TUI and Herdr App adapters. They are future hosts; users can add them as TOML files or external programs.
- New built-in adapters (`add-terminal-hosts` adds Zellij, WezTerm and kitty).
- Terminal emulators without a pane or split API.
- Moving a running board to another host.
- Owners from two different hosts on one board, for example a tmux agent and a WezTerm agent. The board checks owners through the host server of the renderer; owners of other hosts never get the ended state.

## Capabilities

### New Capabilities

- `host-adapters`: selection, priorities, the TOML format, the external program protocol and the `hosts` command.
- `configuration`: the configuration file, its keys, validation and precedence.

### Modified Capabilities

- `diagnostics`: `doctor` reports the selected host and the configuration file.

## Impact

- New modules: `src/hosts/{declarative,external,registry}.ts`, `src/config.ts`, `src/commands/hosts.ts`.
- New runtime dependency: `smol-toml`.
- The launcher, `close` and the owner check use the registry instead of `HOST_ADAPTERS` from `src/hosts/select.ts`. Owner ids keep the form `<host>:<pane id>` from `add-widget-board`.
