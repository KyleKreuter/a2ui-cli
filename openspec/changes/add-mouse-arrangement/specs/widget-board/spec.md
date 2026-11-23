# Spec Delta

## MODIFIED Requirements

### Requirement: Stable order
New widgets SHALL go to the end of the board order. Moves by the user SHALL change the board order. Changes to a widget's components or data SHALL NOT change the board order, and `list` SHALL report positions in the board order.

#### Scenario: Update keeps the position
- **WHEN** widgets `w1`, `w2` and `w3` are shown and an agent updates `w1`
- **THEN** the order stays `w1`, `w2`, `w3`

#### Scenario: User order stays
- **WHEN** the user moved `w3` to the front and an agent then adds `w4` and updates `w3`
- **THEN** the order is `w3`, `w1`, `w2`, `w4` and `list` reports `w3` at position 0
