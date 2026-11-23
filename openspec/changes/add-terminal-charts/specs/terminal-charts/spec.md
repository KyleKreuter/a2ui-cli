# Spec Delta

## Purpose

Draws charts from A2UI `VegaChart` components in the terminal, for the subset of Vega-Lite that agents use most, and keeps them current when their data changes.

## ADDED Requirements

### Requirement: Catalog definition file
The repository SHALL contain `catalogs/v1_0/terminal.json`, the JSON definition of the terminal catalog, with the terminal catalog id, all basic catalog components and functions, and `VegaChart` with the properties `spec` and `height` as in the official 1.0 VegaChart catalog.

#### Scenario: File matches the code
- **WHEN** the test suite generates the catalog definition from the code
- **THEN** it equals `catalogs/v1_0/terminal.json`

### Requirement: Horizontal bar chart
A `VegaChart` with mark `bar`, a nominal or ordinal field on `y` and a quantitative field on `x` SHALL render one row per category with the category label and a bar whose length is proportional to the value, with the value at the end of the bar.

#### Scenario: Test durations
- **WHEN** a chart shows `duration` per `suite` for `api` (12), `ui` (30) and `db` (6)
- **THEN** the terminal shows three rows labeled `api`, `ui` and `db`
- **AND** the `ui` bar is the longest and 2.5 times as long as the `api` bar, within one eighth of a cell

### Requirement: Vertical bar chart
A `VegaChart` with mark `bar`, a nominal or ordinal field on `x` and a quantitative field on `y` SHALL render one column per category with labels below the columns.

#### Scenario: Errors per day
- **WHEN** a chart shows `errors` per `day` for five days
- **THEN** the terminal shows five columns with the day labels below them

### Requirement: Line, area and point charts
A `VegaChart` with mark `line`, `area` or `point` and quantitative or temporal fields on `x` and `y` SHALL render the data on a Braille canvas with axis tick labels. `line` SHALL connect the points in `x` order, and `area` SHALL fill between the line and zero.

#### Scenario: Benchmark runs
- **WHEN** a line chart shows `ms` per `run` for 20 runs
- **THEN** the terminal shows a connected line of Braille characters with tick labels on both axes

#### Scenario: Temporal axis
- **WHEN** the `x` field has type `temporal` and ISO 8601 values over one week
- **THEN** the `x` tick labels show dates

### Requirement: Series and legend
A `color` encoding with a nominal or ordinal field SHALL split the data into series, stacked for bars and as separate lines or point sets otherwise, and SHALL show a legend with each series name. Series SHALL differ by color when the terminal supports 256 or more colors, and by marker character otherwise.

#### Scenario: Two series without color support
- **WHEN** a line chart has series `main` and `branch` and the terminal supports no colors
- **THEN** the series use different marker characters and the legend shows which marker belongs to which series

### Requirement: Aggregates
An encoding with `aggregate` `sum`, `mean`, `count`, `min` or `max` SHALL aggregate the values per category or per `x` value before drawing.

#### Scenario: Count per category
- **WHEN** a bar chart has `y` field `status` and `x` with `aggregate: count`, and the data holds 3 rows `pass` and 1 row `fail`
- **THEN** the `pass` bar shows 3 and the `fail` bar shows 1

### Requirement: Title and axis titles
The renderer SHALL show the specification `title` above the chart and the `title` of each encoding, or else its field name, as the axis title.

#### Scenario: Chart title
- **WHEN** a specification has `"title": "Coverage"`
- **THEN** the line above the chart shows `Coverage`

### Requirement: Chart size
A chart SHALL use the available width of its container. The `height` property in pixels SHALL map to rows at 20 pixels per row, between 4 and 40 rows, with 15 rows for the default height of 290.

#### Scenario: Default height
- **WHEN** a `VegaChart` has no `height`
- **THEN** the line or area canvas is 15 rows high

### Requirement: Live chart updates
A chart whose `spec` is bound to the data model SHALL redraw when a message changes the specification or a value inside it, and SHALL NOT redraw for changes elsewhere in the widget.

#### Scenario: Add a data point
- **WHEN** a line chart in widget `w1` binds `spec` to `/chart` and shows 20 points, and the agent runs `a2ui-term set w1 /chart/data/values` with an array of 21 entries
- **THEN** the chart shows 21 points

### Requirement: Unsupported specifications
For a specification outside the supported subset, the renderer SHALL show a notice in place of the chart that names the first unsupported key by its JSON pointer, and SHALL keep rendering the rest of the surface.

#### Scenario: Transform
- **WHEN** a specification contains `transform`
- **THEN** the chart area shows a notice that names `/transform`
- **AND** the other components of the widget render normally

### Requirement: No data loading
The renderer SHALL NOT load chart data from a URL or a file. A specification with `data.url` SHALL get the unsupported notice for `/data/url`.

#### Scenario: Data from a URL
- **WHEN** a specification has `"data": {"url": "https://example.org/data.json"}`
- **THEN** the renderer opens no network connection and shows the notice for `/data/url`

### Requirement: Charts in the guide
`a2ui-term guide` SHALL describe the terminal catalog id, the `VegaChart` properties, the supported Vega-Lite subset and one example each for a bar chart and a live line chart.

#### Scenario: Guide lists the subset
- **WHEN** an agent runs `a2ui-term guide`
- **THEN** stdout names the marks `bar`, `line`, `area` and `point` and the terminal catalog id
