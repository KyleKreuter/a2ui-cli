# Design

## Context

M1 renders 8 components; the v0.9 basic catalog holds 18: Text, Image, Icon, Video, AudioPlayer, Row, Column, List, Card, Tabs, Modal, Divider, Button, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput. M3 ships tmux as the only declarative adapter. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- Every basic catalog component renders without a placeholder, except media, which renders a deliberate placeholder.

**Non-Goals:**

- Pixel graphics. Terminal image protocols differ per terminal and need their own change.
- Mouse support.

## Decisions

### Templates come from the node layer

`NodeResolver` expands List templates into child nodes per data entry. The List component renders `props.children` like a Column; it implements no template logic itself.

### Own focus registry instead of Ink mount order

Ink focuses in mount order, which breaks tree order when a component mounts later (M1 risk). Replace `useFocus` with a small focus registry in React context: each interactive component registers with its tree path (`/0/2/1`), and `Tab` moves to the next path in sort order. The registry keeps the focused path while it exists and falls back to the nearest following path when it disappears. Modal overlays and the help overlay push a focus scope.

Alternative: keep Ink's `useFocus` and re-mount the surface on structural changes. Rejected: loses TextField cursor and focus on every update.

### ChoicePicker

Try `ink-select-input@6` with Ink 8 first for `mutuallyExclusive`. It has no multiple-selection mode, so `multipleSelection` needs an own component anyway. If the library has any Ink 8 problem, build both variants on the own component and do not add the dependency.

### Icons

A fixed map from the Material Symbols names that agents use most (check, close, add, delete, edit, search, info, warning, error, star, favorite, home, settings, arrow directions) to Unicode symbols. Unknown names render `[name]`.

### Theme colors

Read the surface theme's primary color through the surface model. Use Ink's `chalk` color level to decide between 24-bit, 256 colors and the default focus color.

### Adapter commands

The Zellij, WezTerm and kitty commands come from the original plan and are unverified. Each task verifies the command against the host's current documentation and, where possible, a real install before adding the TOML file. kitty remote control needs `allow_remote_control` in the user's kitty configuration; the kitty adapter reports unusable with that reason when `kitten @ ls` fails, which needs a detection rule beyond the TOML format. If that check cannot be expressed in TOML, this change adds the built-in TypeScript adapter kind that M3 left out, and kitty becomes the first built-in adapter.

### Release

GitHub Actions publishes on tags `v*` with `npm publish --provenance`. A check step compares the tag with `package.json` and looks for the version heading in `CHANGELOG.md`. `files` in `package.json` limits the package contents.

## Risks / Trade-offs

- [The own focus registry replaces a working M1 mechanism] → Land it behind the existing focus tests from M1 before adding new components.
- [kitty detection may not fit the declarative format] → Add the built-in adapter kind, as described above.
- [Homebrew formula maintenance] → Document the formula only; do not run a tap in this change.
