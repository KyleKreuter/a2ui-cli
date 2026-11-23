# Spec Delta

## Purpose

Lets a2ui-term open, focus and close a renderer pane in whatever terminal host the user runs, and lets users and third parties add hosts without a new release.

## ADDED Requirements

### Requirement: No install-time host dependency
a2ui-term SHALL run all commands that do not open a pane on a system with no supported host installed, and SHALL invoke a host only through its command-line program at runtime.

#### Scenario: System without a multiplexer
- **WHEN** no supported host program is on `PATH`
- **THEN** `a2ui-term hosts` exits with code 0 and lists every adapter as not present

### Requirement: Detection without side effects
Adapter detection SHALL read only environment variables and `PATH` lookups, SHALL start no host process, and SHALL finish for all built-in and declarative adapters within 100 ms in total.

#### Scenario: Detect inside tmux
- **WHEN** `TMUX` is set and `tmux` is on `PATH`
- **THEN** the tmux adapter reports present with priority 50

#### Scenario: Variable set but program missing
- **WHEN** `TMUX` is set and `tmux` is not on `PATH`
- **THEN** the tmux adapter reports present but unusable with the reason that `tmux` is not on `PATH`

### Requirement: Adapter selection
With `--host <name>` or `A2UI_TERM_HOST` set, a2ui-term SHALL use exactly that adapter and SHALL fail with its reason when it is unusable. Otherwise it SHALL use the present adapter with the highest priority, and the alphabetically first name on a tie. Adapters in `disabled_hosts` SHALL never be selected.

#### Scenario: Nested hosts
- **WHEN** tmux runs inside a Herdr App terminal, so both adapters report present
- **THEN** the tmux adapter (priority 50) is selected over Herdr App (priority 40)

#### Scenario: Forced host is unusable
- **WHEN** the user passes `--host tmux` and `tmux` is not on `PATH`
- **THEN** the command exits with code 1 and names the reason

#### Scenario: Disabled host
- **WHEN** `disabled_hosts = ["tmux"]` and only tmux is present
- **THEN** no adapter is selected and the fallback applies

### Requirement: Capabilities drive behavior
Each adapter SHALL declare the capabilities `splitDirection`, `focus`, `close` and `keepFocus`. a2ui-term SHALL decide what to do from these capabilities and never from the adapter name.

#### Scenario: Host cannot focus panes
- **WHEN** the selected adapter declares `focus = false` and a client sends `focus`
- **THEN** the renderer shows a hint in its status line and runs no host command

### Requirement: Built-in Herdr TUI adapter
The Herdr TUI adapter SHALL be present when `HERDR_ENV=1` and `herdr` is on `PATH`, with priority 60. It SHALL open a pane with `herdr pane split --current --direction <right|down> --no-focus|--focus`, read the new pane id from `result.pane.pane_id` in the JSON output, start the renderer with `herdr pane run <pane id> <command>`, and close panes with `herdr pane close <pane id>`.

#### Scenario: Open a pane in Herdr
- **WHEN** the Herdr TUI adapter opens a pane to the right without focus
- **THEN** it runs `herdr pane split --current --direction right --no-focus`, then `herdr pane run` with the new pane id and the quoted renderer command

### Requirement: Built-in Herdr App adapter
The Herdr App adapter SHALL be present when its terminal environment variable is set and `herdr-app` is on `PATH`, with priority 40. It SHALL open a pane with `herdr-app do pane.split` and a JSON argument that holds `direction` and the renderer `argv`.

#### Scenario: Open a pane in Herdr App
- **WHEN** the Herdr App adapter opens a pane below
- **THEN** it runs `herdr-app do pane.split` with a JSON argument whose `direction` is `down` and whose `argv` starts the renderer

### Requirement: Built-in adapters load lazily
The code of a built-in adapter SHALL load only when its detection is positive or the user selects it by name.

#### Scenario: Outside Herdr
- **WHEN** `HERDR_ENV` is not set and no host is forced
- **THEN** the Herdr TUI adapter module is not loaded

### Requirement: Declarative TOML adapters
a2ui-term SHALL load adapter definitions from TOML files bundled with the package and from `~/.config/a2ui-term/hosts/<name>.toml`. A user file SHALL replace a bundled file with the same name. Each file SHALL define `name`, `priority`, detection rules (`env_any`, `requires_bin`), capabilities, and `argv` templates for `open`, `focus` and `close`.

#### Scenario: User overrides tmux
- **WHEN** `~/.config/a2ui-term/hosts/tmux.toml` exists with `priority = 70`
- **THEN** `hosts` lists tmux from the user file with priority 70

#### Scenario: Invalid user file
- **WHEN** a user TOML file misses the `open` table
- **THEN** `hosts` lists a warning that names the file and the missing key
- **AND** other adapters still work

### Requirement: Template placeholders
`argv` templates SHALL support `{direction_flag}`, `{focus_flag}`, `{pane_id}`, `{cmd}` (the renderer command as one shell-quoted string) and `{argv...}` (the renderer command as separate arguments). A placeholder whose value is the empty string SHALL remove its argument. The captured pane id SHALL come from `capture`: `stdout_trimmed`, `json:<JSON pointer>` or `none`.

#### Scenario: tmux split without focus
- **WHEN** the bundled tmux adapter opens a pane to the right without focus
- **THEN** it runs `tmux split-window -h -d -P -F #{pane_id} <cmd>` and stores the trimmed stdout as the pane id

#### Scenario: tmux split with focus
- **WHEN** the bundled tmux adapter opens a pane below with focus
- **THEN** it runs `tmux split-window -v -P -F #{pane_id} <cmd>` with no empty argument

### Requirement: No shell execution
a2ui-term SHALL start every host command directly with an argument vector and SHALL never pass it through a shell.

#### Scenario: Pane id with shell characters
- **WHEN** a host returns the pane id `x;rm -rf ~`
- **THEN** the close command receives `x;rm -rf ~` as one literal argument

### Requirement: External adapter programs
When `external_adapters` is true, a2ui-term SHALL treat every program `a2ui-term-host-<name>` on `PATH` as an adapter. It SHALL call it with the subcommands `detect`, `capabilities`, `open --direction <d> --focus <true|false> -- <argv...>`, `focus <pane id>` and `close <pane id>`, read JSON from stdout, and treat a non-zero exit code as an error with the stderr text. `detect` SHALL time out after 500 ms and other subcommands after 3 s.

#### Scenario: External adapter present
- **WHEN** `a2ui-term-host-foo detect` prints `{"present": true, "priority": 40}`
- **THEN** `hosts` lists `foo` as external and present with priority 40

#### Scenario: External adapter hangs
- **WHEN** `a2ui-term-host-foo detect` does not exit within 500 ms
- **THEN** a2ui-term stops the process and lists `foo` as unusable with a timeout reason

### Requirement: Hosts diagnostics command
`a2ui-term hosts [--json]` SHALL list every adapter with its source (built-in, bundled, user file, external), detection result, priority, capabilities, the reason for an unusable adapter, and which adapter would be selected.

#### Scenario: Machine-readable output
- **WHEN** the user runs `a2ui-term hosts --json`
- **THEN** stdout is one JSON document with one entry per adapter and the selected adapter name
