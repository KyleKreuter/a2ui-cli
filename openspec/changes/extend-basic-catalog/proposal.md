# Proposal

## Why

A widget on the board shows more than a form. Progress needs lists of steps with status icons, multi-step flows need tabs, dialogs and choices, and results need lists that grow while the agent works. The renderer supports 8 of the 18 components of the A2UI 1.0 basic catalog, so agents cannot use lists, tabs, modals, choices or sliders yet. This change renders the whole basic catalog.

## What Changes

- Render the remaining basic catalog components: List, Tabs, Modal, Slider, ChoicePicker, DateTimeInput, Icon, and placeholders for Image, Video and AudioPlayer.
- Keep focus order stable when components are added to a shown widget, which agents do all the time with `update` and `set`.
- Add a help overlay with the key bindings, and theme colors from the surface theme where the terminal supports them.
- `a2ui-term guide` lists the new components automatically, since it reads the renderer registry.
- Clicks on the new components follow the click rules from `add-mouse-arrangement`.
- Upgrade the progress and multi-step examples to List, Icon, Tabs and ChoicePicker.

## Out of scope

- Charts (`add-terminal-charts`).
- Images through terminal graphics protocols such as the kitty graphics protocol.
- Mouse input beyond clicks, such as dragging a Slider handle.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `terminal-renderer`: adds requirements for the remaining components, clicks on them, the help overlay, theme colors and stable focus order across widgets.

## Impact

- New modules in `src/render/catalog/`, `src/render/focus/` and `src/render/HelpOverlay.tsx`.
- Possible new runtime dependency: `ink-select-input`, only if it works with Ink 8 (see design).
- Updated examples: `examples/spec-progress.sh`, `examples/wizard.sh`; new examples for each new component.
