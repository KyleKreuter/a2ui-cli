# Spec Delta

## ADDED Requirements

### Requirement: List rendering
The renderer SHALL render a List with its children vertically, or horizontally when `direction` is `horizontal`, including children generated from a data-bound template.

#### Scenario: Template list
- **WHEN** a List uses a template bound to `/items` and `/items` holds three entries
- **THEN** the terminal shows three rendered template instances in order

#### Scenario: Items added
- **WHEN** an `updateDataModel` message adds a fourth entry to `/items`
- **THEN** the List shows four instances

### Requirement: Tabs
The renderer SHALL render Tabs as a tab bar with the tab titles and the content of the selected tab. When the tab bar has focus, `Left` and `Right` SHALL change the selected tab.

#### Scenario: Switch tab
- **WHEN** the tab bar has focus with the first of two tabs selected and the user presses `Right`
- **THEN** the second tab's content is shown

### Requirement: Modal
The renderer SHALL render a Modal's trigger in place. Activating the trigger SHALL show the content as an overlay box above the surface, and `Esc` SHALL close the overlay. While the overlay is open, focus SHALL stay inside it.

#### Scenario: Open and close a modal
- **WHEN** the user activates a Modal trigger and then presses `Esc`
- **THEN** the overlay appears, then disappears, and the trigger has focus again

### Requirement: Slider
The renderer SHALL render a Slider as a bar with its label and value. When focused, `Left` and `Right` SHALL change the bound value by one step within `min` and `max`.

#### Scenario: Increase a value
- **WHEN** a focused Slider with `min` 0, `max` 10 and value 5 receives `Right`
- **THEN** the bound value is 6

#### Scenario: Upper bound
- **WHEN** a focused Slider at its `max` receives `Right`
- **THEN** the value stays at `max`

### Requirement: ChoicePicker
The renderer SHALL render a ChoicePicker as a list of options. For `mutuallyExclusive`, selecting an option SHALL replace the bound value with that option. For `multipleSelection`, `Space` SHALL toggle the option in the bound list.

#### Scenario: Single choice
- **WHEN** a mutually exclusive ChoicePicker has focus and the user moves to the second option and presses `Enter`
- **THEN** the bound value holds only the second option's value

#### Scenario: Multiple choice
- **WHEN** a multiple-selection ChoicePicker has the first option selected and the user toggles the third option with `Space`
- **THEN** the bound value holds the first and third options' values

### Requirement: DateTimeInput
The renderer SHALL render a DateTimeInput as a text field that accepts an RFC 3339 date, time or date-time according to `enableDate` and `enableTime`, and SHALL write the value to the bound path only when it parses.

#### Scenario: Invalid date
- **WHEN** the user enters `2026-13-40` into a date-only DateTimeInput
- **THEN** the field shows a validation hint and the bound value does not change

### Requirement: Icon
The renderer SHALL render an Icon as a Unicode symbol for known icon names and as the icon name in brackets otherwise.

#### Scenario: Known icon
- **WHEN** an Icon has the name `check`
- **THEN** the terminal shows `✓`

#### Scenario: Unknown icon
- **WHEN** an Icon has the name `rocketLaunch` and no symbol is mapped for it
- **THEN** the terminal shows `[rocketLaunch]`

### Requirement: Media placeholders
The renderer SHALL render Image, Video and AudioPlayer as a one-line placeholder with the media kind, the description when given, and the URL.

#### Scenario: Image with description
- **WHEN** an Image has the description `Team photo` and a URL
- **THEN** the terminal shows a placeholder with `Image`, `Team photo` and the URL

### Requirement: Help overlay
Pressing `?` while no text input has focus SHALL show an overlay that lists all key bindings. `?` or `Esc` SHALL close it.

#### Scenario: Show help
- **WHEN** a Button has focus and the user presses `?`
- **THEN** the help overlay lists the keys for focus, activation, surface switching and quit

### Requirement: Theme colors
The renderer SHALL use the surface theme's primary color for focus marking when the terminal supports 24-bit or 256 colors, and SHALL use the default focus color otherwise.

#### Scenario: Theme on a 256-color terminal
- **WHEN** a surface sets a primary color and the terminal reports 256 colors
- **THEN** focused components are marked with the closest 256-color match of the primary color

### Requirement: Stable focus order
Focus order SHALL follow the component tree order, also after components are added to or removed from a shown surface, and the focused component SHALL keep focus while it exists.

#### Scenario: Component added above the focused one
- **WHEN** the second of two Buttons has focus and an update inserts a TextField before the first Button
- **THEN** the second Button keeps focus, and `Shift+Tab` moves focus to the first Button
