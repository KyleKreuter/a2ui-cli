# Proposal

## Why

After M2 the user must open a second terminal and start `serve` by hand. Agents and scripts cannot do that. a2ui-term needs to detect the terminal multiplexer it runs in and open a renderer pane next to the caller, without depending on any multiplexer at install time.

## What Changes

- Add a host adapter interface with capabilities, runtime detection and a replaceable command runner.
- Add three adapter kinds: built-in TypeScript adapters (Herdr TUI, Herdr App), declarative TOML adapters (tmux ships in this change), and external adapter programs named `a2ui-term-host-<name>`.
- Add adapter selection by explicit choice or by detection priority, and a configurable fallback when no host is detected.
- Add `a2ui-term open` and automatic launch in `send` and `ask`, with `--no-open` to turn it off.
- Add `a2ui-term hosts` to list adapters, detection results and reasons.
- Add the configuration file `~/.config/a2ui-term/config.toml` and the precedence flag > environment > file > default.
- `close` closes the pane through its adapter when the adapter supports it.

## Out of scope

- Zellij, WezTerm and kitty adapter files (M5).
- Herdr's raw socket API. The Herdr TUI adapter uses the `herdr` CLI.

## Capabilities

### New Capabilities

- `host-adapters`: the adapter contract, the three adapter kinds, detection, selection, the TOML format, the external program protocol, and the `hosts` command.
- `pane-launcher`: the `open` command and automatic launch from `send` and `ask`, including idempotency, readiness wait and fallback.
- `configuration`: the configuration file, its keys, validation and precedence.

### Modified Capabilities

None. The `pane-client` requirement for an unreachable renderer already covers the case where automatic launch is turned off or unavailable.

## Impact

- New modules: `src/hosts/`, `src/config.ts`, `src/commands/{open,hosts}.ts`.
- New bundled files: `src/hosts/defaults/tmux.toml`, copied into the package.
- New runtime dependencies: `smol-toml`, `which`, `shell-quote`.
- `send`, `ask` and `close` call the launcher; `pane-client` exit codes stay the same.
