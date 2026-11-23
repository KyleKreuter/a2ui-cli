# Design

## Context

`add-widget-board` provides one board per session (`default` unless set), widget owners from the host pane id, and the widget commands. See `proposal.md` for motivation. The authoring machine has tmux 3.8. Facts from `man tmux` (3.8) that the design relies on:

- `split-window [-d] [-h|-v] [-l size[%]] [-P -F format] [-t target-pane] [shell-command [argument ...]]` and `new-window [-d] [-n name] [-P -F format] [shell-command [argument ...]]`. `-d` keeps the current pane active. `-P -F '#{pane_id}'` prints the new pane id.
- A shell command given as multiple arguments runs directly, without `sh -c`, so a2ui-term needs no shell quoting.
- A pane closes when its command exits, unless `remain-on-exit` is on.

## Goals / Non-Goals

**Goals:**

- The first agent that needs the board opens it; every later call reuses it, from any pane, window or tmux session.
- The core depends on the `HostAdapter` interface only, so `add-more-hosts` adds hosts without changing it.
- Every tmux behavior is testable without tmux installed.

**Non-Goals:**

- One board per tmux session or window. The session setting from `add-widget-board` decides the board.

## Decisions

### Interface

```ts
interface HostAdapter {
  readonly name: string;
  detect(env: Env): Detection; // { usable, reason?, callerPane? }
  capabilities: { close: boolean; ownerCheck: boolean; label: boolean };
  open(request: OpenRequest, runner: CommandRunner): Promise<PaneRef>;
  exists(pane: PaneRef, runner: CommandRunner): Promise<boolean>;
  label(pane: PaneRef, runner: CommandRunner): Promise<string | undefined>;
  close(pane: PaneRef, runner: CommandRunner): Promise<void>;
}
```

`OpenRequest` holds the caller pane, the placement (`split` or `window`), the direction, the size in percent and the renderer argv. `detect` reads only the environment and `PATH`. The core decides from `capabilities`, never from `name`.

### Command runner

`CommandRunner.run(argv, { timeoutMs })` wraps `execFile` with `shell: false`, stops the process after 3 s and returns `{ code, stdout, stderr }`. `FakeRunner` records every argv and returns scripted results; adapter tests snapshot the recorded calls.

### tmux commands

| Action | argv                                                                                         |
| ------ | -------------------------------------------------------------------------------------------- |
| split  | `tmux split-window -d -h\|-v -l <size>% -t <caller> -P -F #{pane_id} <renderer argv...>`      |
| window | `tmux new-window -d -n a2ui -P -F #{pane_id} <renderer argv...>`                             |
| exists | `tmux display-message -p -t <pane> #{pane_id}` → exit code 0                                 |
| label  | `tmux display-message -p -t <pane> #{window_name}:#{pane_index}`                             |
| close  | `tmux kill-pane -t <pane>`                                                                   |

The caller pane is `TMUX_PANE` of the calling process. tmux finds its server through `TMUX`, which child processes inherit.

### Placement

| Setting   | Flag                         | Environment           | Default |
| --------- | ---------------------------- | --------------------- | ------- |
| Placement | `--placement split\|window`  | `A2UI_TERM_PLACEMENT` | `split` |
| Direction | `--direction right\|down`    | `A2UI_TERM_DIRECTION` | `right` |
| Size      | `--size <percent>` (10 – 90) | `A2UI_TERM_SIZE`      | `40`    |

A split puts the board next to the first agent. Users with agents in several windows choose `window`, which gives the board its own tmux window.

### Renderer argv and readiness

`[process.execPath, <absolute path of the running cli.js>, "serve", "--session", <id>]`. The path comes from `import.meta.url` of the bundled entry, which resolves into the `npx` cache when a2ui-term runs through `npx`. The launcher probes the socket every 50 ms for at most 5 s; on timeout it closes the new pane and exits with code 1.

### Owner check

Every 2 s, the board checks each distinct owner of its widgets with `exists` of the adapter that the owner's host prefix names, for example the tmux adapter for `tmux:%3`. In this change only the tmux adapter exists, so owners such as `wezterm:12` are skipped until `add-more-hosts` adds their adapter. Widgets of a missing owner get the ended state: a dimmed frame with the tag `ended`. The board does not remove them, because their content, such as a result chart, can still be useful. `remove --ended` removes all ended widgets.

Alternative: a tmux `pane-exited` hook. Rejected: hooks change the user's tmux server configuration and survive a2ui-term crashes.

### Label in tmux

When neither `--label` nor `A2UI_TERM_LABEL` is set, `add` asks the adapter for `#{window_name}:#{pane_index}` of the caller pane, for example `api:1`, so the user sees which agent a widget belongs to.

## Risks / Trade-offs

- [Agent sandboxes can block the tmux socket or the runtime directory, for example Codex `workspace-write` on macOS] → `open` reports the failed tmux command with its stderr; `docs/agents.md` (from `add-agent-workflow`) documents the sandbox settings.
- [`remain-on-exit` keeps a dead board pane] → `close` kills the pane when it still exists after the renderer stopped.
- [The owner check starts one tmux process per owner every 2 s] → Owners are few; the check runs only for owners with widgets.
- [tmux changes flags] → Argv snapshot tests and the optional CI job with a real tmux.
