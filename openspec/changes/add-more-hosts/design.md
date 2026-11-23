# Design

## Context

`add-tmux-board` defines `HostAdapter` with `detect`, `open`, `exists`, `label` and `close` and the capabilities `close`, `ownerCheck` and `label`, and ships tmux as a built-in TypeScript adapter. `add-mouse-arrangement` adds the optional `mouse` query. See `proposal.md` for motivation. The commands for Zellij, WezTerm and kitty below come from the original plan and are unverified; each task checks them against the host's current documentation and a real install where possible.

## Goals / Non-Goals

**Goals:**

- Every adapter is testable without its host installed.
- A host that needs one command per action can be added as a TOML file, without TypeScript.

**Non-Goals:**

- Feature parity across hosts. A host without a capability gets the documented fallback, for example no ended state without `ownerCheck`.

## Decisions

### Built-in adapters

| Host    | Detection                              | Open                                                 | Priority |
| ------- | -------------------------------------- | ---------------------------------------------------- | -------- |
| tmux    | `TMUX`, `TMUX_PANE`, `tmux` on `PATH`  | `add-tmux-board`                                     | 50       |
| Zellij  | `ZELLIJ`, `zellij` on `PATH`           | `zellij run --direction right\|down -- <argv...>`    | 50       |
| WezTerm | `WEZTERM_PANE`, `wezterm` on `PATH`    | `wezterm cli split-pane --right\|--bottom -- <argv...>` | 30    |
| kitty   | `KITTY_WINDOW_ID`, `kitten` on `PATH`  | `kitten @ launch --location=vsplit\|hsplit <argv...>` | 30      |

The innermost host gets the highest priority, because a tmux or Zellij session inside WezTerm or kitty must split inside the multiplexer. kitty remote control needs `allow_remote_control` in the user's kitty configuration; the kitty adapter reports unusable with that reason when `kitten @ ls` fails, which is why kitty detection runs one host process, unlike the others.

### Registry order

`src/hosts/registry.ts` collects adapters in this order: built-in, bundled and user TOML (a user file replaces a bundled file or a built-in adapter by name), external programs. Declarative detection runs in-process; external detection starts the adapter programs in parallel with a 500 ms timeout.

### Declarative format

The TOML schema is a zod schema in `src/hosts/declarative.ts`. A file defines `name`, `priority`, detection rules (`env_any`, `requires_bin`), capabilities, and argv templates for `open`, `open_window`, `exists`, `label`, `close` and `mouse`. Every template except `open` is optional and turns on its capability. Placeholders: `{direction_flag}`, `{caller_pane}`, `{pane_id}`, `{size}` and `{argv...}`, which expands in place to the renderer arguments. Without `open_window`, placement `window` falls back to `split` with a warning. An empty placeholder value removes its argument. `capture = "json:/result/pane/pane_id"` uses a JSON Pointer (RFC 6901); `stdout_trimmed` and `none` are the other capture modes.

### External programs

`src/hosts/external.ts` scans `PATH` once per process for `a2ui-term-host-*` executables. Output is validated with zod. External adapters can be turned off with `external_adapters = false`, because scanning runs third-party code.

### Configuration paths

Use `$XDG_CONFIG_HOME/a2ui-term/` or `~/.config/a2ui-term/` on all Unix platforms, including macOS, because users of terminal multiplexers expect dotfile locations.

## Risks / Trade-offs

- [External adapter scanning runs any matching program on `PATH`] → 500 ms timeout, can be turned off, `hosts` shows the full program path.
- [Host CLIs change their flags] → Argv snapshot tests per adapter; a user TOML file can replace a built-in adapter without a release.
- [Zellij and kitty may lack a way to check a pane by id] → Such adapters declare `ownerCheck = false`; widgets of ended agents then stay without the `ended` tag, `remove --mine` still works, and `hosts` shows the missing capability.
