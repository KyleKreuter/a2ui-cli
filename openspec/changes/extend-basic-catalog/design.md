# Design

## Context

M1 renders 8 components; the 1.0 basic catalog holds 18: Text, Image, Icon, Video, AudioPlayer, Row, Column, List, Card, Tabs, Modal, Divider, Button, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput. See `proposal.md` for motivation. A widget changes its tree while the user works in it, which makes the M1 focus risk (Ink focuses in mount order) a real problem.

## Goals / Non-Goals

**Goals:**

- Every basic catalog component renders without the `[unsupported]` placeholder. Media renders a deliberate placeholder.
- A widget update never moves the user's focus or loses typed text, also in another widget.

**Non-Goals:**

- Pixel graphics. Terminal image protocols differ per terminal and need their own change.
- Mouse input beyond the clicks from `add-mouse-arrangement`.

## Decisions

### Templates come from the node layer

`NodeResolver` expands List templates into child nodes per data entry. The List component renders `props.children` like a Column or Row; it implements no template logic itself.

### Own focus registry instead of Ink mount order

Replace `useFocus` with a small focus registry in React context: each interactive component registers with its widget id and its tree path (`/0/2/1`), and `Tab` moves to the next entry, sorted by board order, then by path. A move by the user re-sorts the entries without moving the focus. The registry keeps the focused path while it exists and falls back to the nearest following path when it disappears. Modal overlays and the help overlay push a focus scope.

Alternative: keep Ink's `useFocus` and re-mount the surface on structural changes. Rejected: loses TextField cursor and focus on every update, which agents would trigger with every `set`.

### ChoicePicker

Try `ink-select-input@6` with Ink 8 first for `mutuallyExclusive`. It has no multiple-selection mode, so `multipleSelection` needs an own component anyway. If the library has any Ink 8 problem, build both variants on the own component and do not add the dependency.

### Icons

A fixed map from the Material Symbols names that agents use most (check, close, add, delete, edit, search, info, warning, error, star, favorite, home, settings, progress_activity, schedule, arrow directions) to Unicode symbols. Unknown names render `[name]`. `progress_activity` renders a spinner that animates while it is shown, so that a step list can show the running step without data updates.

### Theme colors

Read the surface theme's primary color through the surface model. Use Ink's `chalk` color level to decide between 24-bit, 256 colors and the default focus color.

## Risks / Trade-offs

- [The own focus registry replaces a working M1 mechanism] → Land it behind the existing focus tests from M1 before adding new components.
- [An animated spinner re-renders the board 10 times per second] → One shared timer for all spinners, stopped when none is shown.
