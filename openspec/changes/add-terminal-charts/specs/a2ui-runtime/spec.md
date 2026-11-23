# Spec Delta

## ADDED Requirements

### Requirement: Terminal catalog
The runtime SHALL accept surfaces whose `catalogId` is the 1.0 basic catalog id or the a2ui-term terminal catalog id, and SHALL reject other catalog ids. A surface with the basic catalog id SHALL reject `VegaChart` as an unknown component.

#### Scenario: Chart in the terminal catalog
- **WHEN** a `createSurface` message names the terminal catalog id and contains a `VegaChart`
- **THEN** the renderer accepts the surface

#### Scenario: Chart in the basic catalog
- **WHEN** a `createSurface` message names the basic catalog id and contains a `VegaChart`
- **THEN** the renderer rejects the message with a validation error that names `VegaChart`
