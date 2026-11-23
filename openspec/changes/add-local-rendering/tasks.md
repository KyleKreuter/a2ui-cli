# Tasks

## 1. Project setup

- [x] 1.1 Create `package.json` (name `a2ui-term`, `type: module`, `engines.node >=22`, `bin.a2ui-term: dist/cli.js`, scripts `build`, `dev`, `test`, `typecheck`, `lint`, `format`) and verify `npm install` succeeds
- [x] 1.2 Add `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `module: nodenext`, `jsx: react-jsx`) and verify `npm run typecheck` passes on an empty `src/cli.ts`
- [x] 1.3 Add `tsup.config.ts` that bundles `src/cli.ts` to `dist/cli.js` with a shebang and verify `node dist/cli.js --version` prints the package version
- [x] 1.4 Add `vitest.config.ts`, ESLint flat config and Prettier config and verify `npm test`, `npm run lint` and `npm run format -- --check` pass
- [ ] 1.5 Add a GitHub Actions workflow that runs typecheck, lint, test and build on Node.js 22 and 24 on Linux and macOS, and verify it passes on the first push

## 2. A2UI runtime

- [x] 2.1 Implement the JSONL / JSON array codec in `src/protocol/jsonl.ts` with line-numbered parse errors and verify unit tests cover blank lines, arrays and a malformed line
- [x] 2.2 Implement `src/a2ui/processor.ts`: wrap `MessageProcessor` from `@a2ui/web_core/v0_9` with the v0.9 basic catalog, reject other protocol versions, collect errors through `processMessagesWithErrors`, and expose surfaces and action events; verify unit tests cover each scenario of the `a2ui-runtime` spec
- [x] 2.3 Implement `src/log.ts` (JSON lines to a file under the `env-paths` state directory) and verify a unit test writes to a temporary directory and nothing to stdout

## 3. Terminal renderer

- [x] 3.1 Implement `src/render/useSignal.ts` and verify a test updates a signal and observes one re-render
- [x] 3.2 Implement `src/render/catalog/registry.ts`, the placeholder component and `Surface.tsx` (one `NodeResolver` per surface) and verify a snapshot test renders `[unsupported: Chart]` next to a supported sibling
- [x] 3.3 Implement Text, Row, Column, Card and Divider and verify snapshot tests with `ink-testing-library` for each, including heading and caption variants and the Divider width
- [x] 3.4 Implement Button, TextField (including `obscured`) and CheckBox with focus marking and verify input tests: `Tab`/`Shift+Tab` order, `Enter`/`Space` on Button, typing into TextField, `Space` on CheckBox, and the resulting data model values and action events
- [x] 3.5 Implement `App.tsx`: empty state, surface tabs with `Ctrl+Left`/`Ctrl+Right`, status line with the last action, and global keys that skip `q`/`Esc` while a TextField has focus; verify tests for each `terminal-renderer` and `local-preview` key scenario

## 4. Demo command and examples

- [x] 4.1 Implement `src/cli.ts` with `commander` and `src/commands/demo.ts` (file or stdin, `/dev/tty` for keys when stdin is a pipe, alternate screen, terminal restore on exit and on signals) and verify `cat examples/form.jsonl | npm run dev -- demo` shows the form and responds to `Tab`
- [x] 4.2 Add `examples/hello.jsonl`, `form.jsonl`, `confirm.jsonl` and `progress.jsonl` (progress sends several `updateDataModel` messages) and verify a test applies each example without errors
- [x] 4.3 Document installation, `demo` usage and the example files in `README.md` and verify each documented command runs as written

## 5. Acceptance

- [x] 5.1 Run `cat examples/form.jsonl | a2ui-term demo` from the built package, move focus with `Tab`, press the submit Button, and verify the log file contains the `submit` action with the typed values
