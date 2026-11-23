# Spec Delta

## Purpose

Lets users set defaults for host selection and the board once instead of on every call.

## ADDED Requirements

### Requirement: Configuration file
a2ui-term SHALL read optional settings from `config.toml` in `$XDG_CONFIG_HOME/a2ui-term/`, or in `~/.config/a2ui-term/` when `XDG_CONFIG_HOME` is not set. The keys SHALL be `default_host` (string, empty means automatic), `placement` (`split` or `window`), `direction` (`right` or `down`), `size` (integer percent, 10 to 90), `mouse` (boolean), `external_adapters` (boolean) and `disabled_hosts` (list of strings).

#### Scenario: No configuration file
- **WHEN** no configuration file exists
- **THEN** a2ui-term uses the defaults: automatic host, `split`, `right`, 40, mouse on, external adapters on, no disabled hosts

### Requirement: Validation
a2ui-term SHALL reject a configuration file with an unknown key or a wrong value type, and SHALL name the file, the key and the expected type in the error.

#### Scenario: Wrong direction value
- **WHEN** the configuration file contains `direction = "left"`
- **THEN** commands that read the configuration exit with code 1 and name `direction` and the allowed values

### Requirement: Precedence
For each setting, a command-line flag SHALL win over the environment variable `A2UI_TERM_<KEY>` (key in upper case), which SHALL win over the configuration file, which SHALL win over the default.

#### Scenario: Environment overrides file
- **WHEN** the file sets `direction = "down"` and `A2UI_TERM_DIRECTION=right` is set
- **THEN** the board opens to the right

#### Scenario: Flag overrides environment
- **WHEN** `A2UI_TERM_DIRECTION=right` is set and the user passes `--direction down`
- **THEN** the board opens below
