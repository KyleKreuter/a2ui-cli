# Proposal

## Why

Coding agents in the terminal already ask simple questions with their built-in tools, and Claude Code already shows its own task list. What no agent offers is one place where several agents show their state side by side while they work: the progress of a spec, a chart of test runs, a question with context. M2 renders one surface at a time and gives each surface an id that the client picks, so two agents collide as soon as both create a surface `progress`. This change turns the renderer into a board: one scrollable pane on which agents place widgets, get an id back for each one, and update or remove them by that id.

## What Changes

- The renderer shows every surface as a widget on one board, in a 12-column grid with rows that grow with their content. The whole board scrolls.
- Add `a2ui-term add`, which creates a widget from A2UI messages and prints the widget id that the board assigned.
- Add `a2ui-term update`, `a2ui-term set`, `a2ui-term remove` and `a2ui-term list` to change, update values of, remove and list widgets by id.
- Every widget records its owner and a label, and shows them in its frame. `remove --mine` removes all widgets of the caller.
- The session id no longer comes from the host pane: by default all agents of a user share the board of session `default`.
- Surfaces sent with `send` become widgets whose id is their surface id, so M2 clients keep working.
- Extend the socket protocol with `add`, `update`, `remove` and `list` messages.

## Out of scope

- Mouse input and rearranging widgets by drag and drop (`add-mouse-arrangement`).
- Opening the board pane automatically (`add-tmux-board`).
- Moving keyboard focus to a widget when an agent asks something. The board never moves focus by itself.
- Saving the board layout across renderer restarts.

## Capabilities

### New Capabilities

- `widget-board`: the board layout, widget frames, widget ids, owners, scrolling and the status line.
- `widget-commands`: the `add`, `update`, `set`, `remove` and `list` commands.

### Modified Capabilities

- `sessions`: the session id resolution drops the host pane step.
- `socket-protocol`: adds the widget messages.
- `terminal-renderer`: the board replaces the one-surface view with a tab bar.
- `pane-server`: the status line shows the board state.

## Impact

- New modules: `src/board/` (registry, id allocation, message rewriting, layout), `src/render/Board.tsx`, `src/commands/{add,update,set,remove,list}.ts`.
- `src/session/id.ts`, `src/protocol/messages.ts`, `src/server/server.ts`, `src/render/App.tsx` change.
- No new runtime dependencies.
