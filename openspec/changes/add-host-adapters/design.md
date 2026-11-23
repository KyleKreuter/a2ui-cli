# Design

## Context

M2 (`add-pane-server`) provides `serve`, the socket client and the session state file. This change adds pane creation. See `proposal.md` for motivation. tmux is the only bundled host in this change; it is installed on the authoring machine (`/opt/homebrew/bin/tmux`).

## Goals / Non-Goals

**Goals:**

- The core (renderer, protocol, sessions, MCP) depends only on the `HostAdapter` interface.
- Every adapter is testable without the host installed.
- A host that needs one command per action can be added as a TOML file, without TypeScript.

**Non-Goals:**

- Moving or resizing panes after creation.
- Reusing an existing pane that runs something else.
- Built-in TypeScript adapters. When a later host needs multi-step logic (for example, parse a pane id, then run a command in it), that change adds the built-in kind behind the same interface.

## Decisions

### Interface

`src/hosts/types.ts` defines `HostAdapter`, `Capabilities`, `Detection`, `PaneRef` and `CommandRunner` as in the original plan. `detect(env, runner)` receives the environment explicitly so tests do not touch `process.env`.

### Command runner

`CommandRunner.run(argv, { timeoutMs, env })` wraps `execFile` with `shell: false` and kills the process on timeout. `which(bin)` wraps the `which` package. `FakeRunner` records every `argv` and returns scripted results; adapter tests snapshot the recorded calls.

### Registry order

`src/hosts/registry.ts` collects adapters in this order: bundled TOML, user TOML (replaces by name), external programs. Declarative detection runs in-process and needs no host program; external detection starts the adapter program with a 500 ms timeout, in parallel for all programs.

### Priorities

tmux 50. External adapters report their own priority. The innermost host gets the highest priority, because a tmux session inside another terminal host must split inside tmux. M5 adds Zellij 50, WezTerm 30 and kitty 30.

### Declarative format

The TOML schema is a zod schema in `src/hosts/declarative.ts`. Empty placeholder values remove their argument. `{argv...}` expands in place to several arguments. `{cmd}` is the renderer argv joined with `shell-quote`, for hosts such as tmux whose command argument is a shell string; the host program itself still starts without a shell. `capture = "json:/result/pane/pane_id"` uses a JSON Pointer (RFC 6901).

### External programs

`src/hosts/external.ts` scans `PATH` once per process for `a2ui-term-host-*` executables. Output is validated with zod. External adapters can be turned off with `external_adapters = false`, because scanning runs third-party code.

### Renderer argv

`[process.execPath, <absolute path of dist/cli.js>, "serve", "--session", <id>]`. The path comes from `import.meta.url` of the bundled entry, which resolves into the `npx` cache when run through `npx`.

### Configuration paths

Use `$XDG_CONFIG_HOME/a2ui-term/` or `~/.config/a2ui-term/` on all Unix platforms, including macOS, because users of terminal multiplexers expect dotfile locations. Do not use `env-paths` for configuration, since it returns `~/Library/Preferences` on macOS. Keep `env-paths` (with an empty suffix) for the log directory.

### Fallback `new-window`

On macOS, run `open -a Terminal <script>` with a temporary executable script that starts the renderer. Other platforms report that `new-window` is not supported and behave like `hint`.

## Risks / Trade-offs

- [tmux runs `{cmd}` through the user's shell inside the new pane, so an unusual shell configuration can break the start] → Readiness waits on the socket, not on the pane. The timeout path closes the pane and reports the host.
- [External adapter scanning runs any matching program on `PATH`] → Detection has a 500 ms timeout, the feature can be turned off, and `hosts` shows the full program path.
- [Host CLIs change their flags] → Each adapter has argv snapshot tests; a TOML override lets users fix a bundled definition without a release.
