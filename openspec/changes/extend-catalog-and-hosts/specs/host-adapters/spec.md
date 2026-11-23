# Spec Delta

## ADDED Requirements

### Requirement: Bundled Zellij adapter
a2ui-term SHALL ship a declarative Zellij adapter that is present when `ZELLIJ` is set and `zellij` is on `PATH`, with priority 50, and that opens panes with `zellij run --direction <right|down> -- <argv...>`.

#### Scenario: Open in Zellij
- **WHEN** the Zellij adapter opens a pane to the right
- **THEN** it runs `zellij run --direction right --` followed by the renderer arguments

### Requirement: Bundled WezTerm adapter
a2ui-term SHALL ship a declarative WezTerm adapter that is present when `WEZTERM_PANE` is set and `wezterm` is on `PATH`, with priority 30, that opens panes with `wezterm cli split-pane --right|--bottom -- <argv...>`, and captures the trimmed stdout as the pane id.

#### Scenario: Open in WezTerm
- **WHEN** the WezTerm adapter opens a pane below
- **THEN** it runs `wezterm cli split-pane --bottom --` followed by the renderer arguments and stores the printed pane id

### Requirement: Bundled kitty adapter
a2ui-term SHALL ship a declarative kitty adapter that is present when `KITTY_WINDOW_ID` is set and `kitten` is on `PATH`, with priority 30, and that opens panes with `kitten @ launch --location=vsplit|hsplit <argv...>`.

#### Scenario: Open in kitty
- **WHEN** the kitty adapter opens a pane to the right
- **THEN** it runs `kitten @ launch --location=vsplit` followed by the renderer arguments
