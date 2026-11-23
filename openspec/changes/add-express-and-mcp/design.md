# Design

## Context

M1 to M3 provide the renderer, the socket protocol, the client and the pane launcher. See `proposal.md` for motivation. The following facts about `@a2ui/agent@0.1.0` were verified on 2026-11-23 with a Node.js prototype against the 1.0 basic catalog of `@a2ui/web_core@0.15.0`:

- `new A2uiGenerator([new CatalogConfig(catalog, transformers)], undefined, new ExpressFormatFactory())` builds a generator. `createProcessor({ supportedCatalogIds: [catalog.id] })` returns a request processor.
- `processor.parseResponse(text, { wrapped: false })` compiles Express without `<a2ui>` tags and returns parts whose `a2ui` field holds 1.0 messages. A new surface compiles to one `createSurface` message with `components` and `dataModel`, and bindings compile to `@path` and `@call`. Without `surface(...)`, the surface id is `main`.
- Errors are `A2uiError` subclasses with `code`, `message`, and for compile errors `detail`, `line`, `column` and `helpMessage`. A syntax error reports `line: 3, column: 0`; a validation error such as an unknown component reports no line.
- Without a state, Express that only assigns data to an existing surface fails with `A2uiIntegrityError`, because the stateless check sees no surface.
- With `state: RendererState.of(messageProcessor)`, `parseResponse` validates against the live renderer and applies the messages to it, all or nothing. A failing response leaves the data model unchanged.
- `new ComponentPruningTransformer(names)` limits the catalog. The pruned catalog changes both compile validation and `promptSnippet`; a pruned-out component fails with "Component 'X' is not defined in the catalog."
- `processor.promptSnippet` holds the Express grammar and the signatures of the catalog components (about 16 KB for the eight M1 components). It lists Text with `text` and `variant` only, and TextField with `placeholder`.

## Goals / Non-Goals

**Goals:**

- Validation, compilation, the model guide and the renderer use one component list, derived from the Ink catalog registry.
- An invalid Express input never changes the pane.

**Non-Goals:**

- Caching compiled output across calls.
- Express decompilation (JSON to Express).

## Decisions

### Compile Express in the renderer against its live state

The original plan compiled Express in the MCP process and sent JSON over the socket. That breaks Express updates to existing surfaces (verified above: data-only Express needs the surface state), and the MCP process cannot know what other clients changed in the pane. The renderer owns the real state, so it compiles there: the client sends `{"type":"express","id","source"}`, the server calls `parseResponse` with `RendererState.of(processor)`, which applies all or nothing, and answers `compiled` or `error`.

Alternative: keep a mirror `RendererState` per session in the MCP server. Rejected: it diverges as soon as a second client or a renderer restart changes the pane.

### Stateless pre-check in the client

Before it opens a pane or sends anything, the client compiles the Express text without state. A compile error (`A2uiCompilationError` and its subclasses) stops the command with exit code 4. An `A2uiIntegrityError` only means that the text refers to surfaces the client cannot see; the client then sends the text and lets the renderer decide. This keeps "no pane for broken input" without giving up state-aware updates. `compile` uses the same stateless path.

### One component list

`src/a2ui/validate.ts` exports `supportedComponents()`, the keys of the Ink catalog registry. `src/a2ui/express.ts` builds the generator once with `ComponentPruningTransformer(supportedComponents())`. Unknown-component errors get the list appended by a2ui-term, since the SDK message does not contain it.

### JSON input validation

`messages` input from MCP and JSON files keeps the M2 path (`a2ui` socket messages). The MCP server validates `messages` with `validatePayload([catalog], messages)` from `@a2ui/agent` before sending, so the model gets the error in the tool result.

### MCP server

`@modelcontextprotocol/sdk` with `McpServer` and `StdioServerTransport`. Tool input schemas are zod objects; the `express` xor `messages` rule is checked in the handler, because MCP clients render union schemas poorly. `ask_user` uses the same `waitForAction` as the CLI. The server holds no session state besides open socket connections.

### Guide

`a2ui_guide` returns `processor.promptSnippet` of the pruned catalog plus a short section on a2ui-term specifics: surface ids, actions come back as tool results, and headings are Markdown (`## Title`) in a Text, because 1.0 Text has no heading variants. Tool descriptions stay under about 600 characters each and contain one Express example:

```
surface("confirm")
root = Card(Column([Text("Delete 3 files?"), Row([Button(Text("Yes"), "primary", Event("yes")), Button(Text("No"), action=Event("no"))])]))
```

### update_data with Express

The handler rejects Express text that defines a component or a `surface(...)` before compiling: it compiles statelessly with a dummy surface and checks that the result holds only `updateDataModel` messages. It then sends `surface("<surfaceId>")` followed by the text.

### Debug log

With `A2UI_TERM_DEBUG=1`, the renderer logs each compiled message list and the MCP server logs each tool call to the log file.

## Risks / Trade-offs

- [`@a2ui/agent` is at version 0.1.0 and its API can change in any release] → Exact pin; `src/a2ui/express.ts` is the only importer; snapshot tests compile every example.
- [The renderer now runs the Express compiler, which adds `antlr4ng` to the renderer process] → Accept. The renderer and the CLI ship in one package anyway.
- [Old renderers (M2/M3) do not understand `express`] → They answer with a `protocol` error; the client reports that the renderer is too old and names its version from `ready`.

## Open Questions

- The exact MCP configuration file locations for GitHub Copilot CLI and Codex. Verify against their documentation while writing task 4.3; it changes only the docs.
