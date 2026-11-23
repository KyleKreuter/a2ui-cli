# Design

## Context

The repository is empty. See `proposal.md` for motivation. The following facts were verified against the published packages on 2026-11-23 with a Node.js 26 prototype:

- `@a2ui/web_core@0.15.0` imports and runs in Node.js without a DOM. It exports one entry per protocol version (`/v0_8`, `/v0_9`, `/v1_0`).
- `@a2ui/agent@0.1.0` supports protocol v0.9 and v1.0 and depends on `@a2ui/web_core@^0.15.0`.
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
- Markdown in Text components. Text renders its string as plain text.

## Decisions

### Protocol version v0.9

Use A2UI v0.9 with the v0.9 basic catalog (`https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`).

- v0.9 is the production version. v1.0 is a release candidate.
- The v0.9 Text component has the heading variants `h1` to `h5`. The v1.0 Text component has only `caption` and `body`, so terminal headings would need a workaround.
- Both official packages support v0.9 and expose the same component set (18 components) for it.

Alternative: v1.0. Rejected for this milestone. Switching later affects the `a2ui/` wrapper and the catalog registry only.

Pin `@a2ui/web_core` to `0.15.0` exactly (and `@a2ui/agent` to `0.1.0` in M4). Both packages move fast (seven minor releases between August and November 2026), and the renderer relies on the node layer API.

### Render from the node layer, not from raw component models

Use `NodeResolver` from `@a2ui/web_core/v0_9` for each surface. It resolves bindings, templates, child references and action closures. The renderer only maps resolved nodes to Ink elements. This keeps binding and expression logic in the official package.

Alternative: read `SurfaceModel.componentsModel` and resolve bindings in the renderer. Rejected: duplicates `web_core` logic.

### Signal bridge

`useSignal(signal)` subscribes with `effect()` from `@a2ui/web_core/v0_9` and stores the value in React state through `useSyncExternalStore`. Each Ink component subscribes to its own node's `props`, so a data model change re-renders only the affected component.

Use the signal functions re-exported by `@a2ui/web_core/v0_9`. Do not add `@preact/signals-core` as a direct dependency: two copies of the signal library do not share a dependency graph.

### Catalog registry

`src/render/catalog/registry.ts` exports a `Record<string, InkComponent>`. `InkComponent` receives the `ComponentNode` and a `renderChild(node)` function. Nodes with `state` `unknown-type`, or with a type missing from the registry, render the placeholder. `pending` nodes render nothing.

### Focus and keyboard

Use Ink's `useFocus` and `useFocusManager`. Ink focuses components in mount order, which matches tree order for a static tree. The frame component handles global keys (`q`, `Esc`, `Ctrl+C`, `Ctrl+Left`, `Ctrl+Right`) and skips `q` and `Esc` while a TextField has focus. The TextField reports its focus to the frame through React context.

### TextField

Use `ink-text-input` and pass the bound value and `WritableBinding.set`. The `obscured` variant maps to its `mask` prop.

### Input when stdin is a pipe

`cat file | a2ui-term demo` makes stdin a pipe, and Ink cannot read keys from it. The demo reads all messages from the pipe, then opens `/dev/tty` as a `tty.ReadStream` and passes it to Ink as `stdin`. On Windows, `demo` requires a file argument; stdin input with keyboard interaction is not supported there.

### Logging

`src/log.ts` appends JSON lines to `<state dir>/a2ui-term/a2ui-term.log`, with the state directory taken from `env-paths`. It never writes to stdout or stderr while Ink renders.

### Build

`tsup` bundles `src/cli.ts` into one ESM file `dist/cli.js` with a shebang. Dependencies stay external. `tsx` runs the sources during development. `tsc --noEmit` type-checks. TypeScript runs with `strict`, `noUncheckedIndexedAccess`, `module: nodenext` and `jsx: react-jsx`.

## Risks / Trade-offs

- [`web_core` changes its node layer API in a minor release] → Exact version pins; the `a2ui/` wrapper is the only module that imports `web_core` state types; renderer tests cover each component.
- [`web_core` pulls in `lit` and `zod@3` as transitive dependencies, which the terminal renderer does not use] → Accept. `zod@3` is nested and does not conflict with the project's own `zod`.
- [Ink focus order follows mount order, which differs from tree order after a component is added to an existing tree] → Accept for M1. M5 revisits focus handling.
- [`ink-text-input` was last released in May 2024] → It depends on `ink` and `react` only through peers. If it breaks with Ink 8, replace it with a small in-house component; the TextField mapping is the only user.
