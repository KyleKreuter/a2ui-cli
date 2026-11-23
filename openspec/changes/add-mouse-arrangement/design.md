# Design

## Context

`add-widget-board` renders the board with Ink 8.0.0 in a viewport box with `overflowY: "hidden"` and `contentOffsetY`. `add-agent-workflow` adds the `widgetsRemoved` broadcast, and `ask` exits with code 3 when its widget leaves the board. See `proposal.md` for motivation. Facts the design relies on, checked on 2026-11-23:

- Ink 8.0.0 reads stdin with a `'readable'` listener and `stdin.read()`, and drops complete control sequences that map to no key, such as mouse reports, before `useInput`. A second reader on the same stdin would compete with Ink for the data.
- Ink's `measureElement` returns `x`, `y`, `width` and `height` of a box in layout coordinates, without the `contentOffsetY` of an ancestor.
- tmux 3.8 started with `-f /dev/null` has `mouse` on. Its default root bindings pass `MouseDown1Pane`, `MouseDrag1Pane` and `WheelUpPane` to the pane with `send-keys -M` when the pane has turned on mouse reporting (`#{mouse_any_flag}`). `MouseDown1Pane` also selects the pane. `tmux show-options -Av -t <target> mouse` prints `on` or `off`, also when the value is inherited.

## Goals / Non-Goals

**Goals:**

- Every mouse action has a keyboard equivalent.
- A widget update by an agent never moves a widget, also not during a drag.
- The board works unchanged when the terminal or tmux sends no mouse events.

**Non-Goals:**

- Mouse support in `demo`. Only the board gets it.

## Decisions

### Mouse reporting

At start, `serve` writes `CSI ?1000h CSI ?1002h CSI ?1006h`: button events, motion while a button is down, and SGR encoding, which has no coordinate limit. At exit, also on a signal or an uncaught error, it writes the matching `l` sequences. Mode 1003 (all motion) is not used, because the board needs no hover and it would send an event for every pointer move.

### Input filter

`serve` passes Ink a filter stream instead of `process.stdin`. The filter parses SGR mouse reports (`CSI < b ; x ; y M` or `m`), also when a report is split across chunks, emits them as mouse events to the board, and passes all other bytes to Ink unchanged. It forwards `isTTY`, `setRawMode`, `ref` and `unref` to the real stdin. Tests drive the filter with `FakeStdin`.

Alternative: a second listener on `process.stdin`. Rejected: Ink reads with `read()`, so two readers split the data between them.

### Hit testing

After each render, the board measures every widget frame and every focusable component with `measureElement` and stores the rectangles. A mouse event at terminal cell (x, y) maps to layout cell (x − 1, y − 1 + scroll offset). The board looks up the topmost rectangle that contains the cell: first the close mark, then the title line, then focusable components, then the widget body.

### Click

A press and a release on the same cell are a click. A click on a Button focuses and presses it, on a CheckBox focuses and toggles it, on a TextField focuses it, on the close mark removes the widget. A click elsewhere does nothing. A press that moves more than one cell before the release is no click.

### Drag

A press on the title line and a move of at least one cell start a drag. During the drag, the dragged frame is drawn in the accent color, and an insertion marker (a bold vertical bar in the gap) shows the target: before the widget under the pointer when the pointer is in its left half, after it otherwise; after the last widget when the pointer is below all widgets. With the pointer in the first or last visible row, the board scrolls by one row every 50 ms. The release moves the widget to the target. `Esc` or a release on the status line cancels.

Updates from agents during a drag change content and heights, but not the order; the marker follows the new layout.

### Keyboard move mode

While no text input has focus, `m` starts move mode on the widget that holds the focus, or on the first visible widget. In move mode, `Tab` and `Shift+Tab` select another widget, `Left`/`Up` and `Right`/`Down` move the selected widget one position, `x` removes it, `Enter` or `m` ends the mode, and `Esc` restores the order from before the mode started. The status line shows these keys while move mode is on.

### Order

The board keeps one order list. A user move changes it; `add` appends; updates do not touch it. `list` reports the position from that list. Removals by the user go through the same path as `remove`, so `widgetsRemoved` reaches every client.

### Mouse off

`serve --no-mouse` or `A2UI_TERM_MOUSE=off` skips mouse reporting. When the host reports that mouse is off for the board pane, the status line shows `mouse off: tmux set -g mouse on` for 10 seconds. a2ui-term never changes the tmux option itself.

## Risks / Trade-offs

- [Mouse reporting turns off the terminal's own text selection in the board] → The README names the selection modifier of common terminals and tmux copy mode; `--no-mouse` turns it off.
- [A crash leaves the terminal in mouse reporting mode] → Exit handlers for signals and uncaught errors write the `l` sequences; `reset` repairs the terminal.
- [Ink drops a mouse report split across two chunks as garbage] → The filter buffers incomplete sequences, so Ink never sees them.
- [Measuring every focusable component after each render costs time on large boards] → Only rectangles in the visible rows are stored; task 1.3 measures the render time with 50 widgets.
- [A click on the close mark of an `ask` widget ends that `ask` with exit code 3] → Intended: the user declined the question. The guide tells agents to treat exit code 3 as "no answer".
- [Archiving needs the specs of earlier changes] → Archive `add-widget-board`, `add-tmux-board` and `add-agent-workflow` before this change, because its MODIFIED and ADDED deltas extend their capabilities.
