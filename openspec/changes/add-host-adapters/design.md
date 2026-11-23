# Design

## Context

M2 (`add-pane-server`) provides `serve`, the socket client and the session state file. This change adds pane creation. See `proposal.md` for motivation.

Host command facts were checked on 2026-11-23 against the Herdr documentation (`herdr.dev/tui/docs/cli-reference/`, `herdrdev/herdr-app` `docs/commands.md` on branch `master`). Neither Herdr nor Herdr App is installed on the authoring machine; tmux is.

- Herdr TUI sets `HERDR_ENV=1`, `HERDR_PANE_ID`, `HERDR_TAB_ID`, `HERDR_WORKSPACE_ID` and `HERDR_SOCKET_PATH` in its panes.
- `herdr pane split [--current] --direction right|down [--focus|--no-focus]` prints JSON with the new pane id at `.result.pane.pane_id`. Focus is unchanged by default.
- `herdr pane run <pane_id> <command>` types the command plus Enter into the pane's shell. `herdr pane close <pane_id>` closes it.
- Herdr TUI has no CLI command that focuses a pane by id; `herdr pane focus` moves focus by direction only.
- `herdr-app do pane.split` takes a JSON object with the required `direction` and the optional `pane`, `argv` and `mod`. `pane.focus` and `pane.close` exist as actions.

## Goals / Non-Goals

**Goals:**

- The core (renderer, protocol, sessions, MCP) depends only on the `HostAdapter` interface.
- Every adapter is testable without the host installed.

**Non-Goals:**

- Moving or resizing panes after creation.
- Reusing an existing pane that runs something else.

## Decisions

### Interface

`src/hosts/types.ts` defines `HostAdapter`, `Capabilities`, `Detection`, `PaneRef` and `CommandRunner` as in the original plan. `detect(env, runner)` receives the environment explicitly so tests do not touch `process.env`.

### Command runner

`CommandRunner.run(argv, { timeoutMs, env })` wraps `execFile` with `shell: false` and kills the process on timeout. `which(bin)` wraps the `which` package. `FakeRunner` records every `argv` and returns scripted results; adapter tests snapshot the recorded calls.

### Registry order and lazy loading

`src/hosts/registry.ts` collects adapters in this order: built-in detection rules, bundled TOML, user TOML (replaces by name), external programs. Built-in entries hold only `{ name, priority, detect, load: () => import('./builtin/<name>.js') }`. The registry calls `load()` after a positive detection or a forced selection. `tsup` keeps the dynamic imports as separate chunks.

### Priorities

Herdr TUI 60, tmux 50, Herdr App 40. The innermost host has the highest priority, because a tmux session inside a Herdr App terminal must split inside tmux. M5 adds Zellij 50, WezTerm 30 and kitty 30.

### Herdr TUI capabilities

`splitDirection: true`, `keepFocus: true`, `close: true`, `focus: false`, because no by-id focus command exists. The adapter quotes the renderer command with `shell-quote` for `herdr pane run`, since that command types into a shell. This is the one place where a shell string is built; the adapter still starts `herdr` itself without a shell.

### Herdr App capabilities

`splitDirection: true`, `focus: true`, `close: true`. `keepFocus: false` until the documentation states whether `pane.split` moves focus. The adapter passes the renderer as `argv` in the JSON argument, so no shell string is needed.

### Declarative format

The TOML schema is a zod schema in `src/hosts/declarative.ts`. Empty placeholder values remove their argument. `{argv...}` expands in place to several arguments. `capture = "json:/result/pane/pane_id"` uses a JSON Pointer (RFC 6901).

### External programs

`src/hosts/external.ts` scans `PATH` once per process for `a2ui-term-host-*` executables. Output is validated with zod. External adapters can be turned off with `external_adapters = false`, because scanning runs third-party code.

### Renderer argv

`[process.execPath, <absolute path of dist/cli.js>, "serve", "--session", <id>]`. The path comes from `import.meta.url` of the bundled entry, which resolves into the `npx` cache when run through `npx`.

### Configuration paths

Use `$XDG_CONFIG_HOME/a2ui-term/` or `~/.config/a2ui-term/` on all Unix platforms, including macOS, because users of terminal multiplexers expect dotfile locations. Do not use `env-paths` for configuration, since it returns `~/Library/Preferences` on macOS. Keep `env-paths` (with an empty suffix) for the log directory.

### Fallback `new-window`

On macOS, run `open -a Terminal <script>` with a temporary executable script that starts the renderer. Other platforms report that `new-window` is not supported and behave like `hint`.

## Risks / Trade-offs

- [`herdr pane run` types into a shell, so a slow shell start or an unusual shell can break the command] → Readiness waits on the socket, not on the pane. The timeout path closes the pane and reports the host.
- [External adapter scanning runs any matching program on `PATH`] → Detection has a 500 ms timeout, the feature can be turned off, and `hosts` shows the full program path.
- [Host CLIs change their flags] → Each adapter has argv snapshot tests; a TOML override lets users fix a bundled definition without a release.

## Open Questions

- Which environment variable identifies a terminal inside Herdr App. The documentation read on 2026-11-23 does not name one; `HC_TERMINAL_ID` is a candidate. Confirm with `herdr-app --skill` or the Herdr App source before implementing task 4.2. The answer changes only the detection rule of one adapter.
- Whether `herdr-app do pane.split` returns the new pane id at the top level (`pane`) or nested. Confirm with a real call during task 4.2; it changes one capture path.
