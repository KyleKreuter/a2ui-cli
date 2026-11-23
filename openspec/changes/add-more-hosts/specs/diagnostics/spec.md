# Spec Delta

## ADDED Requirements

### Requirement: Doctor reports hosts and configuration
`a2ui-term doctor` SHALL report the selected host adapter with its source and capabilities, and the configuration file path with its validation result.

#### Scenario: Invalid configuration file
- **WHEN** the configuration file contains an unknown key and the user runs `a2ui-term doctor`
- **THEN** the configuration check is `fail` and names the key
- **AND** the command exits with code 1
