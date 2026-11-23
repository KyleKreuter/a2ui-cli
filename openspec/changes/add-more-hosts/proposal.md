# Proposal

## Why

`add-tmux-board` opens the board in tmux only. Many users run their agents in Zellij, WezTerm or kitty, and some use hosts that a2ui-term does not know. The `HostAdapter` interface from `add-tmux-board` already separates the core from tmux. This change adds the three hosts, lets users and third parties add their own without a release, and adds a configuration file for host choice and board defaults.

## What Changes

- Add built-in adapters for Zellij, WezTerm and kitty behind the `HostAdapter` interface from `add-tmux-board`.
- Add host selection by explicit choice or by detection priority, with the innermost host first.
- Add declarative TOML adapters and external adapter programs named `a2ui-term-host-<name>`.
- Add `a2ui-term hosts` to list adapters, detection results and reasons.
- Add the configuration file `~/.config/a2ui-term/config.toml` with the precedence flag > environment > file > default.
- `doctor` reports the selected host and the configuration file status.

## Out of scope

- Herdr TUI and Herdr App adapters. They are future hosts; users can add them as TOML files or external programs.
- Terminal emulators without a pane or split API.
- Moving a running board to another host.
- Owners from two different hosts on one board, for example a tmux agent and a WezTerm agent. The board checks owners with the host it runs in; owners of other hosts never get the ended state.

## Capabilities

### New Capabilities

- `host-adapters`: the bundled Zellij, WezTerm and kitty adapters, selection, priorities, the TOML format, the external program protocol and the `hosts` command.
- `configuration`: the configuration file, its keys, validation and precedence.

### Modified Capabilities

- `diagnostics`: `doctor` reports the selected host and the configuration file.

## Impact

- New modules: `src/hosts/{zellij,wezterm,kitty,declarative,external,registry}.ts`, `src/config.ts`, `src/commands/hosts.ts`.
- New runtime dependency: `smol-toml`.
- The launcher and the owner check use the registry instead of the tmux adapter directly. Owner ids keep the form `<host>:<pane id>` from `add-widget-board`.
