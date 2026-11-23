# Tasks

## 1. Catalog

- [ ] 1.1 Implement `src/a2ui/catalogs.ts` (basic and terminal catalog, accepted ids) and generate `catalogs/v1_0/terminal.json`, and verify tests for both `a2ui-runtime` scenarios and that the file matches the code

## 2. Chart model

- [ ] 2.1 Implement `src/render/charts/spec.ts` (zod subset, first unsupported key as JSON pointer, aggregates, series split) and verify unit tests for each supported key, `transform`, `data.url` and each aggregate
- [ ] 2.2 Implement scales (linear with rounded ticks, band, time) and verify unit tests for tick values and ISO 8601 and epoch input

## 3. Drawing

- [ ] 3.1 Implement horizontal and vertical bars with eighth blocks and stacking, and verify snapshot tests for the test-duration and errors-per-day scenarios and a stacked bar
- [ ] 3.2 Implement the Braille canvas with line, area and point marks, axes and legend, and verify snapshot tests for the benchmark, temporal and two-series scenarios with and without color
- [ ] 3.3 Implement the `VegaChart` Ink component (size mapping, memoized drawing, notice) and verify tests for the default height, a live update through `updateDataModel`, no redraw for unrelated updates, and the unsupported notice next to other components

## 4. Guide, examples and documentation

- [ ] 4.1 Extend `a2ui-term guide` with the chart section and verify that its examples are accepted by a renderer and the 12 KB limit still holds
- [ ] 4.2 Add `examples/chart-bars.jsonl` and `examples/chart-live.sh` (a line chart that grows with `set`), document charts and the font requirement in `README.md`, and verify the documented commands run as written

## 5. Acceptance

- [ ] 5.1 In tmux with Claude Code, ask the agent to run the test suite five times and show the durations as a live line chart widget on the board. Verify that the chart grows after each run. Record the results in the pull request
