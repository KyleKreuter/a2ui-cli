# Spec Delta

## ADDED Requirements

### Requirement: Express socket message
The socket protocol SHALL accept `{"type":"express","id":<string>,"source":<string>}`. The server SHALL compile the source against its live state and answer the sender with `{"type":"compiled","id","surfaceIds"}` on success or with an `error` of `source` `compile` that carries the same `id`, `line`, `column` and `hint` on failure.

#### Scenario: Successful Express message
- **WHEN** a client sends an `express` message with id `7` that creates surface `form`
- **THEN** the client receives `{"type":"compiled","id":"7","surfaceIds":["form"]}`
