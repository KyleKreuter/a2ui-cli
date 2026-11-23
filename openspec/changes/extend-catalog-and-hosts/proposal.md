# Proposal

## Why

After M4, agents can show forms and confirmations, but the renderer supports only 8 of the 18 v0.9 basic catalog components, so agents cannot use lists, tabs, choices or sliders. a2ui-term also opens panes only in tmux, while many users run Zellij, WezTerm or kitty. This change closes both gaps and prepares the first public release.

## What Changes

- Render the remaining basic catalog components: List, Tabs, Modal, Slider, ChoicePicker, DateTimeInput, Icon, and placeholders for Image, Video and AudioPlayer.
- Express accepts these components automatically, since its component list comes from the renderer registry.
- Add a help overlay with the key bindings, and theme colors from the surface theme where the terminal supports them.
- Keep focus order stable when components are added to a shown surface.
- Ship declarative adapters for Zellij, WezTerm and kitty.
- Publish the package to npm with provenance, and document an optional Homebrew formula.

## Out of scope

- Images through the kitty graphics protocol.
- Herdr TUI and Herdr App adapters, and a native Herdr App renderer.
- A Copilot CLI plugin.

## Capabilities

### New Capabilities

- `release`: how a2ui-term is versioned, built and published.

### Modified Capabilities

- `terminal-renderer`: adds requirements for the remaining components, the help overlay, theme colors and stable focus order.
- `host-adapters`: adds requirements for the bundled Zellij, WezTerm and kitty adapters.

## Impact

- New modules in `src/render/catalog/` and `src/render/HelpOverlay.tsx`.
- New bundled files: `src/hosts/defaults/{zellij,wezterm,kitty}.toml`.
- New runtime dependency: `ink-select-input` (if it works with Ink 8; see design).
- New CI workflow for releases.
