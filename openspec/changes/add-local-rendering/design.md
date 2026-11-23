# Design

## Context

The repository is empty. See `proposal.md` for motivation. The following facts were verified against the published packages on 2026-11-23 with a Node.js 26 prototype:

- `@a2ui/web_core@0.15.0` imports and runs in Node.js without a DOM. It exports one entry per protocol version (`/v0_8`, `/v0_9`, `/v1_0`).
- The 1.0 basic catalog (`https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`) has the same 18 components as the v0.9 catalog. Messages carry `"version": "1.0"`, and `createSurface` can carry `components` and `dataModel`.
- In 1.0, a data binding is `{"@path": "/x"}` and a function call is `{"@call": "name", "args": {}}`. The processor accepts the v0.9 forms `{"path"}` and `{"call"}` without an error and keeps them as literal object values.
- In 1.0, component ids must be Unicode identifiers (UAX #31): `submitLabel` is valid, `submit-label` fails validation.
- The 1.0 Text component has only the variants `caption` and `body`. Its `text` supports simple Markdown without HTML, images and links. The 1.0 TextField has a `placeholder` property.
- A 1.0 action payload can carry a resolved `userMessage`.
- The processor answers a `callRendererFunction` message with a `rendererFunctionResponse` message, which it passes to the `outboundListener` option. All functions of the basic catalog are renderer-only, so an agent call to one of them gets an `INVALID_FUNCTION_CALL` response.
- `@a2ui/agent@0.1.0` supports protocol v0.9 and 1.0 and depends on `@a2ui/web_core@^0.15.0`. Against the 1.0 basic catalog, it compiles Express to 1.0 messages.
- `MessageProcessor(catalogs, actionHandler)` applies messages. `processMessagesWithErrors()` returns errors instead of throwing.
- `NodeResolver(surface)` exposes `rootNode`, a signal of a resolved `ComponentNode` tree. Each node has `type`, `state` (`resolved`, `pending`, `unknown-type`, `cyclic`) and `props`, a signal.
- In resolved props, child references are `ComponentNode` values, dynamic values are `ResolvedBinding` objects (`{ value }`), bound input values are `WritableBinding` objects (`{ value, set, path }`), and actions are functions. Calling an action function invokes the action handler with `{ name, surfaceId, sourceComponentId, timestamp, context }`, where `context` holds resolved values.
- `ink@8.0.0` requires `react@>=19.3.0` and Node.js `>=22`. `ink-text-input@6` declares `ink >=5` as peer.
- `@a2ui/react` exists, but renders through DOM custom elements and needs `react-dom`. It is not usable with Ink.

## Goals / Non-Goals

**Goals:**

- A renderer layer that knows nothing about sockets: it receives a processor and an action callback.
- One registry that maps component type names to Ink components. Later milestones derive the list of supported components from it.

**Non-Goals:**

- Theme support beyond a fixed color for focus.
- Mouse input.
- Full Markdown in Text components. Text renders the subset described below.

## Decisions

### Protocol version 1.0

Use A2UI 1.0 with the 1.0 basic catalog (`https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`). The runtime rejects messages with any other `version`, and messages without one.

- a2ui-term has no release yet. Starting on 1.0 means its first users never see a protocol change.
- Both official packages support 1.0 and expose the same 18 components for it.
- 1.0 adds renderer function calls (`callRendererFunction`), which v0.9 does not have.

Alternative: v0.9, the version this milestone first targeted. Rejected: a later switch to 1.0 breaks every agent and script written against a2ui-term, because binding syntax and Text variants differ.

`src/a2ui/webcore.ts` is the only module that imports `@a2ui/web_core`, and it imports from `/v1_0`.

Pin `@a2ui/web_core` to `0.15.0` exactly. The A2UI packages move fast (seven minor releases between August and November 2026), and the renderer relies on the node layer API.

### Render from the node layer, not from raw component models

Use `NodeResolver` from `@a2ui/web_core/v1_0` for each surface. It resolves bindings, templates, child references and action closures. The renderer only maps resolved nodes to Ink elements. This keeps binding and expression logic in the official package.

Alternative: read `SurfaceModel.componentsModel` and resolve bindings in the renderer. Rejected: duplicates `web_core` logic.

### Signal bridge

`useSignal(signal)` subscribes with `effect()` from `@a2ui/web_core/v1_0` and stores the value in React state through `useSyncExternalStore`. Each Ink component subscribes to its own node's `props`, so a data model change re-renders only the affected component.

Use the signal functions re-exported by `@a2ui/web_core/v1_0`. Do not add `@preact/signals-core` as a direct dependency: two copies of the signal library do not share a dependency graph.

### Catalog registry

`src/render/catalog/registry.ts` exports a `Record<string, InkComponent>`. `InkComponent` receives the `ComponentNode` and a `renderChild(node)` function. Nodes with `state` `unknown-type`, or with a type missing from the registry, render the placeholder. `pending` nodes render nothing.

### Focus and keyboard

Use Ink's `useFocus` and `useFocusManager`. Ink focuses components in mount order, which matches tree order for a static tree. The frame component handles global keys (`q`, `Esc`, `Ctrl+C`, `Ctrl+Left`, `Ctrl+Right`) and skips `q` and `Esc` while a TextField has focus. The TextField reports its focus to the frame through React context.

### Text and Markdown

1.0 has no heading variants, so headings come from Markdown in `text`. `src/render/markdown.ts` parses this subset into styled spans:

- A line that starts with one to six `#` and a space is a heading. It renders bold, without the `#` marks.
- A line that starts with `- ` or `* ` is a list item. It renders with `•` in place of the marker.
- `**text**` renders bold, `*text*` renders italic, and `` `text` `` renders in the code color, all without their marks. A backslash before a mark keeps the mark as text.
- All other text, including links, images and HTML, renders as written.

`_` and `__` are no emphasis marks. Agents write identifiers such as `file_name` in plain text, and treating `_` as a mark would italicize parts of them.

The `caption` variant dims the whole text. Styles from the parent, such as a focused Button's color, apply to every span. Each span carries its full style instead of nesting Ink texts, and a Markdown-bold span in dimmed text is not dimmed: bold and dim both end with SGR 22, and Ink's output stage (`@alcalzone/ansi-tokenize@0.3.1`) does not re-open dim after a span that is both bold and dim.

Alternative: `marked` with `marked-terminal`. Rejected: it renders full Markdown, including links and tables, which the 1.0 catalog excludes, and adds two dependencies for a small subset.

### TextField

Use `ink-text-input` and pass the bound value and `WritableBinding.set`. The `obscured` variant maps to its `mask` prop. `placeholder` maps to its `placeholder` prop. An empty field without focus shows the placeholder dimmed, or `…` without a placeholder.

### Outbound renderer messages

The runtime passes an `outboundListener` to `MessageProcessor` and forwards each outbound message (`rendererFunctionResponse`, `callAgentFunction`) to handlers registered with `onOutbound()`. `demo` has no agent, so it writes these messages to the log. M2 sends them to the client that sent the call.

### Input when stdin is a pipe

`cat file | a2ui-term demo` makes stdin a pipe, and Ink cannot read keys from it. The demo reads all messages from the pipe, then opens `/dev/tty` as a `tty.ReadStream` and passes it to Ink as `stdin`. On Windows, `demo` requires a file argument; stdin input with keyboard interaction is not supported there.

### Logging

`src/log.ts` appends JSON lines to `<state dir>/a2ui-term/a2ui-term.log`, with the state directory taken from `env-paths`. It never writes to stdout or stderr while Ink renders.

### Build

`tsup` bundles `src/cli.ts` into one ESM file `dist/cli.js` with a shebang. Dependencies stay external. `tsx` runs the sources during development. `tsc --noEmit` type-checks. TypeScript runs with `strict`, `noUncheckedIndexedAccess`, `module: nodenext` and `jsx: react-jsx`.

Use TypeScript 6.0. `typescript-eslint@8` declares `typescript <6.1.0` as peer, so TypeScript 7 waits for a `typescript-eslint` release that supports it.

## Risks / Trade-offs

- [Agents trained on v0.9 write `{"path": ...}`, which 1.0 accepts as a literal value, so the binding silently does not work] → Examples, the README and the agent guide (`add-agent-workflow`) use `@path` and `@call` only. The `version` check rejects v0.9 messages before they reach the processor.

- [`web_core` changes its node layer API in a minor release] → Exact version pins; the `a2ui/` wrapper is the only module that imports `web_core` state types; renderer tests cover each component.
- [`web_core` pulls in `lit` and `zod@3` as transitive dependencies, which the terminal renderer does not use] → Accept. `zod@3` is nested and does not conflict with the project's own `zod`.
- [Ink focus order follows mount order, which differs from tree order after a component is added to an existing tree] → Accept for M1. M7 (`extend-basic-catalog`) revisits focus handling.
- [Ink 8 handles one input chunk as one key, so `\t\t` or three Backspaces sent in one write (for example by `tmux send-keys` with several keys) act as one key press] → Accept for M1; interactive typing sends one key per write. Tests and scripted checks send one key per write.
- [`ink-text-input` was last released in May 2024] → It depends on `ink` and `react` only through peers. If it breaks with Ink 8, replace it with a small in-house component; the TextField mapping is the only user.
