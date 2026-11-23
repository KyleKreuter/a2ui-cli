# Design

## Context

`add-widget-board` provides one board per session (`default` unless set), widget owners from the host pane id, and the widget commands. See `proposal.md` for motivation. The authoring machine has tmux 3.8. Facts from `man tmux` (3.8) that the design relies on:

- `split-window [-d] [-h|-v] [-l size[%]] [-P -F format] [-t target-pane] [shell-command [argument ...]]` and `new-window [-d] [-n name] [-P -F format] [shell-command [argument ...]]`. `-d` keeps the current pane active. `-P -F '#{pane_id}'` prints the new pane id.
- A shell command given as multiple arguments runs directly, without `sh -c`, so a2ui-term needs no shell quoting.
- A pane closes when its command exits, unless `remain-on-exit` is on.
- A new pane gets the environment of the tmux server, not of the calling process, plus the variables of `-e NAME=VALUE`, and starts in the directory of `-c`.
- tmux 3.8 expands the formats of `display-message -t <pane>` to empty values and exits with 0 when the pane does not exist. Older versions fail with `can't find pane`.

## Goals / Non-Goals

**Goals:**

- The first agent that needs the board opens it; every later call reuses it, from any pane, window or tmux session.
- The core depends on the `HostAdapter` interface only, so `add-terminal-hosts` adds a host with one adapter file and one entry in `src/hosts/select.ts`.
- Every tmux behavior is testable without tmux installed.

**Non-Goals:**

- One board per tmux session or window. The session setting from `add-widget-board` decides the board.

## Decisions

### Interface

```ts
interface HostAdapter {
  readonly name: string;
  readonly capabilities: { close: boolean; ownerCheck: boolean; label: boolean };
  detect(env: Env): Detection; // { usable: true, callerPane } or { usable: false, reason }
  installed(env: Env): boolean;
  instance(env: Env): string | undefined;
  open(request: OpenRequest, runner: CommandRunner): Promise<PaneRef>;
  paneState(pane: PaneRef, runner: CommandRunner): Promise<'live' | 'dead' | 'missing' | 'unknown'>;
  label(pane: PaneRef, runner: CommandRunner): Promise<string | undefined>;
  close(pane: PaneRef, runner: CommandRunner): Promise<void>;
}
```

`OpenRequest` holds the caller pane, the placement (`split` or `window`), the direction, the size in percent, the renderer argv, the environment variables the pane needs and its working directory. `detect` reads only the environment and `PATH`. `installed` tells whether the host program is on `PATH`, for the owner check of a renderer that runs outside the host. `instance` names the host server, for tmux the socket path in `TMUX`, because pane ids are unique only within one server. `paneState` replaces a boolean `exists`: `dead` (the command exited, the pane stays) ends widgets like `missing`, and `unknown` (timeout, no server) changes nothing. The core decides from `capabilities`, never from `name`. A new host adds its adapter file and one entry in `HOST_ADAPTERS` in `src/hosts/select.ts`.

### Command runner

`CommandRunner.run(argv)` wraps `execFile` with `shell: false`, stops the process with `SIGKILL` after 3 s and returns `{ code, stdout, stderr, timedOut }`. `FakeRunner` records every argv and returns scripted results; adapter tests snapshot the recorded calls.

### tmux commands

| Action | argv                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| split  | `tmux split-window -d -h\|-v -l <size>% -t <caller> -c <cwd> [-e NAME=VALUE...] -P -F #{pane_id} <renderer argv...>` |
| window | `tmux new-window -d -n a2ui -c <cwd> [-e NAME=VALUE...] -P -F #{pane_id} <renderer argv...>`                     |
| state  | `tmux display-message -p -t <pane> '#{pane_id} #{pane_dead}'`                                                    |
| label  | `tmux display-message -p -t <pane> '#{pane_id} #{window_name}:#{pane_index}'`                                    |
| close  | `tmux kill-pane -t <pane>`                                                                                       |

The caller pane is `TMUX_PANE` of the calling process. tmux finds its server through `TMUX`, which child processes inherit. The launcher passes `XDG_RUNTIME_DIR` and `TMPDIR` with `-e` when they are set, because they decide where the session files are, and the working directory of the caller with `-c`. State and label start with `#{pane_id}`: output whose first field is not the requested pane id means the pane is missing, also on tmux 3.8. A non-zero exit code with `can't find` in stderr means missing too; any other failure or a timeout means unknown.

### Placement

| Setting   | Flag                         | Environment           | Default |
| --------- | ---------------------------- | --------------------- | ------- |
| Placement | `--placement split\|window`  | `A2UI_TERM_PLACEMENT` | `split` |
| Direction | `--direction right\|down`    | `A2UI_TERM_DIRECTION` | `right` |
| Size      | `--size <percent>` (10 – 90) | `A2UI_TERM_SIZE`      | `40`    |

A split puts the board next to the first agent. Users with agents in several windows choose `window`, which gives the board its own tmux window.

### Renderer argv and readiness

`[process.execPath, ...process.execArgv, realpath(process.argv[1]), "serve", "--session", <id>, "--launched"]`. `process.argv[1]` is the running entry script, which resolves into the `npx` cache when a2ui-term runs through `npx`; `process.execArgv` keeps loaders such as `tsx` in development. The hidden flag `--launched` makes the renderer write `launched: true` into the state file. The launcher probes the socket every 50 ms for at most 5 s and then reads the pane id from the state file; on timeout it closes the new pane and exits with code 1. When two agents open the board at the same time, both panes start a renderer; the second renderer finds the session claimed and exits, and both launchers report the pane of the first.

### Closing the board pane

`close` reads the state file, stops the renderer, and waits until the renderer has removed the state file. It then closes the pane through the adapter when the state has `launched: true`, the caller's host `instance` equals the `hostInstance` in the state, and the pane is not missing. So `close` never closes a pane in which the user started `serve`, and never runs `kill-pane` on another tmux server, where the same pane id can name another pane.

### Owner check

Every 2 s, the board checks each distinct owner of its widgets that have not ended with `paneState` of the adapter that the owner's host prefix names, for example the tmux adapter for `tmux:%3`. It skips adapters without `ownerCheck` and hosts whose program is not installed. In this change only the tmux adapter exists, so owners such as `wezterm:12` are skipped until `add-terminal-hosts` adds their adapter. Widgets of a `missing` or `dead` owner get the ended state: a dimmed frame with the tag `ended`. The board does not remove them, because their content, such as a result chart, can still be useful. `remove --ended` removes all ended widgets.

Alternative: a tmux `pane-exited` hook. Rejected: hooks change the user's tmux server configuration and survive a2ui-term crashes.

### Label in tmux

When neither `--label` nor `A2UI_TERM_LABEL` is set and the selected host has the `label` capability, `add` asks the adapter for `#{window_name}:#{pane_index}` of the caller pane, for example `api:1`, so the user sees which agent a widget belongs to.

## Risks / Trade-offs

- [Agent sandboxes can block the tmux socket or the runtime directory, for example Codex `workspace-write` on macOS] → `open` reports the failed tmux command with its stderr; `docs/agents.md` (from `add-agent-workflow`) documents the sandbox settings.
- [`remain-on-exit` keeps a dead board pane] → `close` kills the pane that `open` created when it still exists after the renderer stopped.
- [The renderer runs outside tmux or in another tmux server than the agents] → The owner check asks the tmux server of the renderer. A pane id there can belong to another pane, so a widget may not end; `unknown` results never end a widget.
- [The owner check starts one tmux process per owner every 2 s] → Owners are few; the check runs only for owners with widgets.
- [tmux changes flags] → Argv snapshot tests and the optional CI job with a real tmux.
