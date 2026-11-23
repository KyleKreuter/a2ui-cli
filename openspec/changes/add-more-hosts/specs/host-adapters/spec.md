# Spec Delta

## Purpose

Lets a2ui-term open the board in whatever terminal host the user runs, and lets users and third parties add hosts without a new release.

## ADDED Requirements

### Requirement: Bundled Zellij adapter
a2ui-term SHALL ship a Zellij adapter that is usable when `ZELLIJ` is set and `zellij` is on `PATH`, with priority 50, and that opens the board with `zellij run --direction <right|down> --` followed by the renderer arguments.

#### Scenario: Open in Zellij
- **WHEN** the Zellij adapter opens the board to the right
- **THEN** it runs `zellij run --direction right --` followed by the renderer arguments

### Requirement: Bundled WezTerm adapter
a2ui-term SHALL ship a WezTerm adapter that is usable when `WEZTERM_PANE` is set and `wezterm` is on `PATH`, with priority 30, that opens the board with `wezterm cli split-pane --right|--bottom --` followed by the renderer arguments, and that captures the trimmed stdout as the pane id.

#### Scenario: Open in WezTerm
- **WHEN** the WezTerm adapter opens the board below
- **THEN** it runs `wezterm cli split-pane --bottom --` followed by the renderer arguments and stores the printed pane id

### Requirement: Bundled kitty adapter
a2ui-term SHALL ship a kitty adapter that is usable when `KITTY_WINDOW_ID` is set, `kitten` is on `PATH` and `kitten @ ls` succeeds, with priority 30, and that opens the board with `kitten @ launch --location=vsplit|hsplit` followed by the renderer arguments.

#### Scenario: Remote control off
- **WHEN** `KITTY_WINDOW_ID` is set and `kitten @ ls` fails
- **THEN** the kitty adapter is not usable, with the reason that kitty remote control is off

### Requirement: Adapter selection
With `--host <name>` or `A2UI_TERM_HOST` set, a2ui-term SHALL use exactly that adapter and SHALL fail with its reason when it is not usable. Otherwise it SHALL use the usable adapter with the highest priority, and the alphabetically first name on a tie. Adapters in `disabled_hosts` SHALL never be selected.

#### Scenario: tmux inside WezTerm
- **WHEN** tmux (priority 50) and WezTerm (priority 30) are both usable
- **THEN** the tmux adapter is selected

#### Scenario: Forced host is unusable
- **WHEN** the user passes `--host zellij` and `ZELLIJ` is not set
- **THEN** the command exits with code 1 and names the reason

### Requirement: Capabilities drive behavior
a2ui-term SHALL decide the owner check, the widget label, the mouse hint, the `window` placement and pane closing from the adapter's capabilities and never from its name. A missing capability SHALL skip the behavior without an error.

#### Scenario: Host without owner check
- **WHEN** the selected adapter declares `ownerCheck = false` and an agent pane closes
- **THEN** its widgets stay on the board without the `ended` tag

### Requirement: Declarative TOML adapters
a2ui-term SHALL load adapter definitions from `~/.config/a2ui-term/hosts/<name>.toml`. A user file SHALL replace a built-in adapter with the same name. Each file SHALL define `name`, `priority`, detection rules (`env_any`, `requires_bin`), capabilities, and argv templates for `open` and, per capability, `open_window`, `exists`, `label`, `close` and `mouse`.

#### Scenario: User adds a host
- **WHEN** `~/.config/a2ui-term/hosts/herdr.toml` defines a valid adapter whose detection variable is set
- **THEN** `hosts` lists `herdr` from the user file as usable

#### Scenario: Invalid user file
- **WHEN** a user TOML file misses the `open` table
- **THEN** `hosts` lists a warning that names the file and the missing key
- **AND** other adapters still work

### Requirement: Template placeholders
`argv` templates SHALL support `{direction_flag}`, `{caller_pane}`, `{pane_id}`, `{size}` and `{argv...}`. A placeholder whose value is the empty string SHALL remove its argument. The pane id SHALL come from `capture`: `stdout_trimmed`, `json:<JSON pointer>` or `none`.

#### Scenario: Expand the renderer arguments
- **WHEN** an `open` template is `["myhost", "split", "{direction_flag}", "--", "{argv...}"]`
- **THEN** the renderer arguments appear as separate arguments after `--`

### Requirement: External adapter programs
When `external_adapters` is true, a2ui-term SHALL treat every program `a2ui-term-host-<name>` on `PATH` as an adapter. It SHALL call it with the subcommands `detect`, `open --placement <p> --direction <d> --size <n> --caller <pane> -- <argv...>`, `exists <pane>`, `label <pane>`, `mouse <pane>` and `close <pane>`, read JSON from stdout, and treat a non-zero exit code as an error with the stderr text. `detect` SHALL time out after 500 ms and other subcommands after 3 s.

#### Scenario: External adapter present
- **WHEN** `a2ui-term-host-foo detect` prints `{"usable": true, "priority": 40}`
- **THEN** `hosts` lists `foo` as external and usable with priority 40

#### Scenario: External adapter hangs
- **WHEN** `a2ui-term-host-foo detect` does not exit within 500 ms
- **THEN** a2ui-term stops the process and lists `foo` as not usable with a timeout reason

### Requirement: Hosts command
`a2ui-term hosts [--json]` SHALL list every adapter with its source (built-in, user file, external), detection result, priority, capabilities, the reason for an unusable adapter, and which adapter would be selected.

#### Scenario: Machine-readable output
- **WHEN** the user runs `a2ui-term hosts --json`
- **THEN** stdout is one JSON document with one entry per adapter and the selected adapter name
