# Proposal

## Why

A widget on the board next to the agent is the place for results that text in the conversation shows badly: test durations, benchmark runs, coverage per package, error counts over time. The A2UI 1.0 basic catalog has no chart component. The A2UI project defines charts in a separate catalog with one component, `VegaChart`, which takes a Vega-Lite specification. Its npm package is not published, and its renderers draw to a browser canvas, which a terminal does not have. This change draws a defined subset of Vega-Lite in the terminal with Unicode blocks and Braille dots, and updates charts live when the agent changes their data.

## What Changes

- Add the a2ui-term terminal catalog: the 1.0 basic catalog plus `VegaChart`, with the same properties as the official 1.0 VegaChart catalog.
- Accept surfaces that name the basic catalog or the terminal catalog.
- Render a Vega-Lite subset: bar, line, area and point marks, x, y and color encodings, simple aggregates, axes, legend and title.
- Redraw a chart when its bound specification or data changes, for example through `a2ui-term set`.
- Show a notice instead of a chart for Vega-Lite features outside the subset.
- Extend `a2ui-term guide` with the terminal catalog and the supported Vega-Lite subset; add chart examples.

## Out of scope

- Full Vega or Vega-Lite: transforms, layers, facets, concatenation, selections and parameters.
- Loading chart data from URLs. a2ui-term never fetches data.
- Pixel output through terminal graphics protocols.
- Interaction with charts, such as tooltips or clicking a bar.

## Capabilities

### New Capabilities

- `terminal-charts`: the terminal catalog, the VegaChart component, the supported Vega-Lite subset and its rendering.

### Modified Capabilities

- `a2ui-runtime`: accepts the terminal catalog id in addition to the basic catalog id.

## Impact

- New modules: `src/a2ui/catalogs.ts`, `src/render/charts/` (spec parser, scales, Braille canvas, bar and line renderers, legend).
- New file: `catalogs/v1_0/terminal.json`, the published catalog definition.
- New examples: `examples/chart-bars.jsonl`, `examples/chart-live.sh`.
- No new runtime dependencies.
