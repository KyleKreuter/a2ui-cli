# Tasks

## 1. Focus

- [ ] 1.1 Replace Ink's `useFocus` with the focus registry (board order, then tree path) and focus scopes, and verify that all M1 and board focus tests pass and new tests cover the "component added above the focused one" scenario and a widget move by the user

## 2. Components

- [ ] 2.1 Implement List (vertical, horizontal, template children) and verify tests for three items and an added fourth item
- [ ] 2.2 Implement Tabs and Modal (overlay with focus scope and `Esc`) and verify input tests for tab switching and opening and closing a modal
- [ ] 2.3 Implement Slider and verify input tests for step change and both bounds
- [ ] 2.4 Implement ChoicePicker (single and multiple selection, after checking `ink-select-input` with Ink 8) and verify input tests for both variants and the bound values
- [ ] 2.5 Implement DateTimeInput and verify tests for valid and invalid date, time and date-time input
- [ ] 2.6 Implement Icon (with the animated `progress_activity` spinner) and the media placeholders, and verify snapshot tests for a known icon, an unknown icon, the spinner frames and each media kind
- [ ] 2.7 Add click handling for tab titles, ChoicePicker options, Modal triggers and Slider on top of the hit testing from `add-mouse-arrangement`, and verify input tests for each
- [ ] 2.8 Verify by test that the renderer registry holds all 18 basic catalog components and that `a2ui-term guide` lists each of them; add an example per new component under `examples/`

## 3. Frame

- [ ] 3.1 Implement the help overlay and verify a snapshot test that lists every key binding
- [ ] 3.2 Implement theme focus colors and verify tests for 24-bit, 256-color and no-color terminals

## 4. Examples and documentation

- [ ] 4.1 Upgrade `examples/spec-progress.sh` to a List of tasks with Icon status and `examples/wizard.sh` to Tabs and ChoicePicker, update the README component list, and verify the example tests from `add-agent-workflow` still pass

## 5. Acceptance

- [ ] 5.1 In tmux, run `examples/spec-progress.sh` and `examples/wizard.sh` side by side on one board, type into a TextField while `set` updates the other widget, and verify that focus and typed text stay. Record the results in the pull request
