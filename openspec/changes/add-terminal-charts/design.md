# Design

## Context

The official VegaChart catalog for 1.0 has the id `https://a2ui.org/specification/v1_0/catalogs/vegachart/catalog.json` and one component, `VegaChart`, with `spec` (`DynamicValue`, required, a Vega-Lite specification as a JSON object) and `height` (`DynamicNumber`, optional, pixels, default 290). Checked on 2026-11-23 in `google/A2UI` under `catalogs/vegachart/v1/catalog.json`. The npm package `@a2ui/catalog-vegachart` is not published. An A2UI surface names exactly one catalog, so the official samples combine the basic catalog and VegaChart under a new catalog id. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- The charts that agents show most often look right in a terminal: horizontal bars for categories, lines for series over time or runs.
- A VegaChart surface written for a2ui-term is valid A2UI that other renderers with a VegaChart component can show.
- Data updates redraw a chart without flicker.

**Non-Goals:**

- Rendering every valid Vega-Lite specification. Everything outside the subset gets a clear notice.

## Decisions

### Terminal catalog

`src/a2ui/catalogs.ts` builds two catalogs with `@a2ui/web_core`: the basic catalog, and the terminal catalog with the basic components and functions plus `VegaChart`. The terminal catalog id is `https://raw.githubusercontent.com/KyleKreuter/a2ui-cli/main/catalogs/v1_0/terminal.json`, the location of its definition file in this repository, generated from the code and checked by a test. A surface with the basic catalog id keeps rejecting `VegaChart` as an unknown component.

Alternative: accept `VegaChart` under the basic catalog id. Rejected: such surfaces are not valid A2UI for any other renderer.

### Vega-Lite subset

A zod schema in `src/render/charts/spec.ts` accepts:

| Key                  | Supported                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `data`               | `values` (inline array of objects)                                                          |
| `mark`               | `bar`, `line`, `area`, `point`, as a string or `{ "type": ... }`                            |
| `encoding.x` / `.y`  | `field`, `type` (`quantitative`, `nominal`, `ordinal`, `temporal`), `aggregate` (`sum`, `mean`, `count`, `min`, `max`), `title` |
| `encoding.color`     | `field` with `nominal` or `ordinal` type                                                    |
| `title`, `description` | strings                                                                                   |
| `$schema`, `width`, `height`, `config` | accepted and ignored; the widget decides the size                          |

Every other top-level or encoding key is unsupported. The parser reports the first unsupported key by its JSON pointer.

### Drawing

- Bars: a nominal or ordinal axis with a quantitative axis. Categories on `y` give horizontal bars, one row per category, drawn with the eighth-block characters `▏▎▍▌▋▊▉█`. Categories on `x` give vertical columns with `▁▂▃▄▅▆▇█`. A color field stacks the segments.
- Lines, areas and points: a canvas of Braille characters with 2 × 4 dots per cell. Lines connect points with Bresenham segments; areas fill to the zero line; points set one dot cluster.
- Scales: linear with rounded ticks for quantitative, band for nominal and ordinal, time for temporal (ISO 8601 strings and epoch milliseconds).
- Axes: tick labels on the left and bottom, the field name or `title` as axis title.
- Series: up to 8 colors from a fixed palette in 256-color and 24-bit terminals. Without color, series use different markers (`●`, `○`, `■`, `□`) and the legend shows them.
- Size: the chart uses the widget width. `height` in pixels maps to rows at 20 pixels per row, from 4 to 40 rows; the default of 290 gives 15 rows.

### Live updates

`NodeResolver` resolves `spec` from the data model, so an `updateDataModel` on any path inside a bound specification re-renders the component. The chart memoizes its drawn lines by the resolved specification and the width, so updates elsewhere on the surface do not redraw it.

### No data loading

`data.url` and named data sets are unsupported keys. The renderer never opens a network connection or reads a file for a chart.

## Risks / Trade-offs

- [Agents write Vega-Lite features outside the subset] → The notice names the key; `a2ui-term guide` lists the subset with two examples.
- [The terminal catalog id is a GitHub URL tied to the repository location] → Accept for now. If the project moves, the old id stays accepted as an alias.
- [Braille characters need a font that has them] → Most terminal fonts do. `doctor` does not check fonts; the README names the requirement.
