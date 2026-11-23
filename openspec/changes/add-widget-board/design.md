# Design

## Context

M2 provides sessions, the socket protocol and `serve`, `send`, `ask`, `close`. M1 shows one surface at a time with a tab bar. See `proposal.md` for motivation. Ink lays out with Yoga, which supports `flexWrap` and percentage widths, and Ink 8.0.0 has the Box props `overflowY: "hidden"` and `contentOffsetY`, which shift the content of a box, plus `measureElement`, which returns the position and size of a box after layout.

## Goals / Non-Goals

**Goals:**

- An agent never has to choose a unique surface id or a position; it names a width and gets an id.
- An update to one widget never moves another widget or the scroll position.
- The board stays usable with the keyboard alone.

**Non-Goals:**

- Free placement with coordinates. Agents do not know the pane size or the other widgets.
- Fixed widget heights.

## Decisions

### A widget is one surface

`add` takes A2UI messages with exactly one `createSurface`, and optionally `updateComponents` and `updateDataModel` messages for the same surface. The board allocates the widget id `w<n>` (`w1`, `w2`, ...), counting up for the lifetime of the renderer and never reusing an id, so a stale id fails instead of changing another widget. It replaces the `surfaceId` of every input message with the widget id, so the A2UI surface id is the widget id. Actions of the widget therefore carry the widget id as `surfaceId`. `update` accepts `updateComponents` and `updateDataModel` only and rewrites their `surfaceId` the same way; `createSurface` and `deleteSurface` there are input errors with exit code 4. The board applies the messages of one `add` or `update` all or nothing.

Surfaces that a client creates with a plain `a2ui` message (M2 `send`) become widgets with the surface id as widget id, width 12 and no owner. Surface ids of the form `w<digits>` are reserved for the board and rejected in plain messages.

Alternative: let agents pick widget ids. Rejected: two agents that both pick `progress` collide, which is the problem this change solves.

### Grid and layout

The board is a 12-column grid. `add --width <1-12>` sets the widget width in columns, default 6. The board lays out widgets in board order from left to right and starts a new row when the next widget does not fit; a row is as high as its highest widget, and each widget is as high as its content. Below 80 terminal columns every widget takes the full width. This is `flexDirection: row` with `flexWrap: wrap` in Yoga, with the widths as percentages.

New widgets go to the end of the board order. `update` and `set` never change the order. `add-mouse-arrangement` lets the user change the order.

Alternative: a masonry layout that fills gaps under short widgets. Rejected for now: the position of a widget would depend on the heights of others, so updates would move widgets around.

### Scrolling

The board renders all widgets into a content box inside a viewport box with the terminal height minus the status line, `overflowY: "hidden"` and `contentOffsetY` set to the scroll offset. After each render, the board measures the content box with `measureElement` and clamps the offset to `content.height - viewport.clientHeight`, as the Ink documentation recommends. `PageUp`, `PageDown`, `Home` and `End` scroll by page and to the ends; `Up` and `Down` scroll by line while no text input has focus. `Tab` focus works across all widgets as in M1 and scrolls the focused component into view. When content changes, the scroll offset stays, unless it would pass the new end.

Spike result (task 2.1, Ink 8.0.0): a column of 200 rows in a 20-row terminal, with one row changing every 100 ms, scrolls with `contentOffsetY` as designed. `End` shows row 199 as the last row above the status line, `Home` shows row 0, and every frame has exactly 20 rows, one frame per update. Two details matter. First, the viewport needs an explicit height (terminal rows minus the status line) and `flexShrink: 0`; with `flexGrow` alone, Yoga gives it the full terminal height and the status line overlaps the last row. Second, the board must fill the terminal exactly: Ink clears the whole screen for every frame that is higher than the terminal, which flickers, and writes only changed lines for a frame of exactly the terminal height.

### Frame

Each widget has a rounded border. The top border line shows the title (`--title`), the label and the widget id, for example `Build · api-agent · w3`, so the user can refer to a widget by id. 

### Owner and label

`add` records an owner: `--owner`, then `A2UI_TERM_OWNER`, then `<host>:<pane id>` of the caller, for example `tmux:%3` for `TMUX_PANE=%3`, else none. The host pane comes from the M2 host table: `TMUX_PANE` (`tmux`), `ZELLIJ_PANE_ID` (`zellij`), `WEZTERM_PANE` (`wezterm`) and `KITTY_WINDOW_ID` (`kitty`), in this order, so tmux wins when it runs inside WezTerm or kitty. The host prefix tells the board which host adapter checks the pane; owner ids never depend on tmux alone. The label is `--label`, then `A2UI_TERM_LABEL`, then the owner. `remove --mine` removes every widget whose owner equals the caller's owner. `add-tmux-board` adds the check whether an owner pane still exists.

### Session id

The resolution becomes `--session`, then `A2UI_TERM_SESSION`, then `default`. One board per user is the default, independent of panes, windows and tmux sessions. The derived `tmux-_3` ids from M2 go away; the host pane id moves to the owner.

### Protocol

New client messages, each with a client-chosen request `id`:

| Client message                                                        | Reply to the sender                       |
| --------------------------------------------------------------------- | ----------------------------------------- |
| `{"type":"add","id","messages","width","title","owner","label"}`       | `{"type":"added","id","widgetId"}`        |
| `{"type":"update","id","widgetId","messages"}`                         | `{"type":"updated","id"}`                 |
| `{"type":"remove","id","widgetIds"}` or `{"type":"remove","id","owner"}` | `{"type":"removed","id","widgetIds"}`   |
| `{"type":"list","id"}`                                                 | `{"type":"widgets","id","widgets":[...]}` |

Errors for these messages are `error` messages with the same `id`. A widget entry in `widgets` holds `widgetId`, `title`, `label`, `owner`, `width` and `position` (index in board order). `clear` from M2 removes all widgets.

## Risks / Trade-offs

- [`contentOffsetY` is new in Ink 8 and unproven with 200 rows of content and frequent updates] → Task 2.1 starts with a spike that renders 200 rows in a 20-row terminal, scrolls and updates without flicker. If it fails, the board renders only the widgets in view and computes positions itself.
- [A tall widget makes its row tall and leaves empty space next to short widgets] → Accept. Agents choose the width; the guide recommends width 12 for long content.
- [Changing the session id resolution breaks M2 setups that relied on `tmux-_3` ids] → Nothing is released. The README and `docs/protocol.md` change with it.
- [Archiving needs the M1 and M2 specs in `openspec/specs/`] → Archive `add-local-rendering` and `add-pane-server` before this change, because its MODIFIED and REMOVED deltas need the existing requirements.
