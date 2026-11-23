# Proposal

## Why

With `add-widget-board`, agents share one board, but the user must start `a2ui-term serve` in a pane by hand, and widgets of an agent that has ended stay on the board without any sign. In tmux, a2ui-term can open the board pane itself the first time an agent needs it, and can see which agent panes still exist.

## What Changes

- Add a host adapter interface and a built-in tmux adapter.
- Add `a2ui-term open`, which opens the board pane once and waits until the renderer is ready. The calling pane keeps the focus.
- `add`, `send` and `ask` open the board automatically when no renderer runs, unless `--no-open` is given.
- The board opens as a split next to the calling pane or as its own tmux window.
- The board marks widgets as ended when their owner pane closes, and `remove --ended` removes them.
- In tmux, the default widget label is the window name and pane index of the agent.
- `close` also closes the board pane when the renderer stopped but the pane stays open.
- Without tmux, `open` prints the `serve` command to run in another terminal.

## Out of scope

- Hosts other than tmux (`add-more-hosts`).
- Moving the focus to the board. The board never takes the focus; the user switches to it.
- A configuration file. Placement, direction and size come from flags and environment variables.
- Floating panes and popups.

## Capabilities

### New Capabilities

- `pane-launcher`: host-independent board lifecycle: `open`, idempotency, readiness wait, the renderer command, automatic launch, placement and the fallback without a host.
- `tmux-host`: detection of tmux and the exact tmux commands.

### Modified Capabilities

- `widget-board`: adds the ended state for widgets whose owner pane is gone, and the tmux label.

## Impact

- New modules: `src/hosts/` (`types.ts`, `runner.ts`, `tmux.ts`, `select.ts`), `src/launcher/`, `src/commands/open.ts`.
- `add`, `send`, `ask`, `remove` and `close` change; the board gains the owner check.
- No new runtime dependencies. tmux stays a runtime-only dependency.
