# Design

## Context

`add-tmux-board` defines `HostAdapter` with `detect`, `installed`, `instance`, `open`, `paneState`, `label` and `close`, the capabilities `close`, `ownerCheck` and `label`, and the tmux adapter. Owners already have the form `zellij:<id>`, `wezterm:<id>` and `kitty:<id>` from the variables `ZELLIJ_PANE_ID`, `WEZTERM_PANE` and `KITTY_WINDOW_ID`. See `proposal.md` for motivation.

The commands below come from the original plan in `add-more-hosts` and are not verified. Each adapter task first checks them against the current documentation of the host and a real installation, and corrects this design and the spec before the code.

## Goals / Non-Goals

**Goals:**

- Each adapter is one file plus one entry in `HOST_ADAPTERS`. The core does not change.
- Every adapter is testable without its host installed, with `FakeRunner` argv snapshots like the tmux adapter.
- The caller pane keeps the focus in every host.

**Non-Goals:**

- The same capabilities in every host. A host without a capability gets the documented fallback.

## Decisions

### Detection order

`HOST_ADAPTERS` lists tmux, Zellij, WezTerm, kitty. A multiplexer inside a terminal emulator must split inside the multiplexer, so the multiplexers come first. This is the same order as the owner detection in `src/session/host.ts`.

### Planned commands

| Host    | Detection                                         | Open                                                                    | Pane state                    | Close                                  | Instance              |
| ------- | ------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------- | -------------------------------------- | --------------------- |
| Zellij  | `ZELLIJ`, `ZELLIJ_PANE_ID`, `zellij` on `PATH`    | `zellij run --direction right\|down --cwd <cwd> -- <argv...>`           | to check                      | to check                               | `ZELLIJ_SESSION_NAME` |
| WezTerm | `WEZTERM_PANE`, `wezterm` on `PATH`               | `wezterm cli split-pane --pane-id <caller> --right\|--bottom --percent <size> --cwd <cwd> -- <argv...>` | `wezterm cli list --format json` | `wezterm cli kill-pane --pane-id <id>` | `WEZTERM_UNIX_SOCKET` |
| kitty   | `KITTY_WINDOW_ID`, `kitten` on `PATH`, `kitten @ ls` succeeds | `kitten @ launch --location=vsplit\|hsplit --keep-focus --cwd=<cwd> <argv...>` | `kitten @ ls`                 | `kitten @ close-window --match id:<id>` | `KITTY_LISTEN_ON`     |

Placement `window` maps to a new tab where the host has one (`wezterm cli spawn`, `kitten @ launch --type=tab`), and to `split` with a note in the result otherwise.

### Focus

When a host moves the focus to the new pane, the adapter moves it back to the caller pane with the host's activate command, for example `wezterm cli activate-pane --pane-id <caller>`. The spec of each host names the command once it is verified.

### kitty remote control

kitty runs `kitten @` commands only with `allow_remote_control` in the user's kitty configuration. Detection therefore runs `kitten @ ls` once, unlike the other adapters, and reports the reason when it fails. This is the only adapter whose detection starts a process; `add-tmux-board` allows detection to read only the environment and `PATH`, so this change records the exception in the `kitty-host` spec.

## Risks / Trade-offs

- [Host CLIs change their flags] → Argv snapshot tests per adapter, and the manual check in each host before the archive.
- [Zellij may have no command that tells whether a pane id exists] → The adapter declares `ownerCheck: false`; widgets of a closed agent then stay without the `ended` tag, and `remove --mine` still works.
- [`zellij run` may not print the new pane id] → Without a pane id, the adapter declares `close: false`, and `close` leaves the pane to Zellij, which closes it when the renderer exits.
