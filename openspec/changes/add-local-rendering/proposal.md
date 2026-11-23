# Proposal

## Why

Coding agents and scripts can describe UI with A2UI, but no renderer shows A2UI surfaces inside a terminal. A local renderer is the base for every later milestone: the pane server, host adapters and the MCP server all reuse it.

## What Changes

- Set up the `a2ui-term` package: TypeScript, ESM, one bundled `bin`, test runner, lint and format configuration.
- Add an A2UI runtime layer on top of `@a2ui/web_core` that accepts A2UI protocol 1.0 messages as JSON Lines or as a JSON array, applies them to surface state and reports actions.
- Add a terminal renderer built with Ink that maps the first set of basic catalog components to terminal output: Text, Row, Column, Card, Divider, Button, TextField and CheckBox.
- Add keyboard focus navigation and action dispatch for interactive components.
- Add the `demo` subcommand, which renders A2UI messages from a file or stdin in the current terminal without a socket.
- Add JSON Lines examples: `hello`, `form`, `confirm`, `progress`.

## Out of scope

- Socket server, sessions and the `send`/`ask`/`close` commands (milestone M2).
- Host adapters and pane launching (M3).
- A2UI Express input and the MCP server (M4).
- The remaining basic catalog components (List, Tabs, Modal, Slider, ChoicePicker, Icon, media) (M5).

## Capabilities

### New Capabilities

- `a2ui-runtime`: accepting, validating and applying A2UI messages, and producing resolved user actions, for one pinned protocol version.
- `terminal-renderer`: how A2UI surfaces and components look and behave in a terminal, including focus and keyboard input.
- `local-preview`: the `demo` command that renders A2UI messages in the current terminal.

### Modified Capabilities

None.

## Impact

- New repository content: `package.json`, `tsconfig.json`, `src/`, `test/`, `examples/`.
- New runtime dependencies: `@a2ui/web_core`, `ink`, `react`, `ink-text-input`, `commander`, `env-paths`.
- New development dependencies: `typescript`, `tsup`, `tsx`, `vitest`, `ink-testing-library`, `@types/node`, `@types/react`, `eslint`, `prettier`.
