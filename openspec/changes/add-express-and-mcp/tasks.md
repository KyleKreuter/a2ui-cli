# Tasks

## 1. Express compilation

- [ ] 1.1 Add `@a2ui/agent@0.1.0` (exact), implement `src/a2ui/validate.ts` (`supportedComponents()` from the registry) and `src/a2ui/express.ts` (pruned generator, stateless and state-aware compile, error mapping to message, line, column, hint and supported components), and verify unit tests for a valid form, a syntax error with line 3, an unknown component and the default surface id `main`
- [ ] 1.2 Implement `src/commands/compile.ts` and verify tests for output as JSON Lines, exit code 4 on error and empty stdout on error
- [ ] 1.3 Add `examples/form.a2ui`, `confirm.a2ui` and `progress.a2ui` and verify snapshot tests of their compiled output

## 2. Express over the socket

- [ ] 2.1 Add the `express` and `compiled` messages to `src/protocol/messages.ts` and the `compile` error source, and verify schema tests
- [ ] 2.2 Handle `express` in `src/server/` with `RendererState.of(processor)` and verify integration tests: a new surface returns `compiled` with its surface ids, a data-only update changes the shown value, and an invalid input leaves the data model unchanged
- [ ] 2.3 Add `--express` and `.a2ui` detection to `send` and `ask`, with the stateless pre-check before launch, and verify end-to-end tests: valid Express returns the action, a syntax error exits with 4 and opens no pane, and an old renderer yields a clear version error
- [ ] 2.4 Document Express input, `compile` and the new socket messages in `README.md` and `docs/protocol.md` and verify the documented commands run as written

## 3. MCP server

- [ ] 3.1 Implement `src/mcp/server.ts` and `src/commands/mcp.ts` with stdio transport and verify a test with an in-memory MCP client that lists the four tools and the `a2ui_guide` prompt and resource
- [ ] 3.2 Implement `show_ui`, `ask_user`, `update_data` and `close_ui` in `src/mcp/tools.ts` and verify tests against a fake renderer for each `mcp-server` scenario, including both inputs given, timeout, closed, Express with components in `update_data`, and an unknown component
- [ ] 3.3 Implement `src/mcp/guide.ts` and verify a test that the guide lists every supported component signature and no other component
- [ ] 3.4 Verify by test that `a2ui-term mcp` writes only MCP messages to stdout while a renderer logs debug output

## 4. Doctor and documentation

- [ ] 4.1 Implement `src/commands/doctor.ts` (`--json`, exit code 1 on any `fail`) and verify tests for a healthy environment, an old Node.js version (faked) and no host
- [ ] 4.2 Report the A2UI protocol version and package versions in `ready` and `--version` from one module, and verify a test compares both outputs
- [ ] 4.3 Write `docs/mcp.md` with setup for Claude Code (`claude mcp add a2ui-term -- npx -y a2ui-term mcp`), GitHub Copilot CLI and Codex, after checking each tool's current documentation, and verify each documented configuration on a real install where available

## 5. Acceptance

- [ ] 5.1 Run `a2ui-term ask examples/form.a2ui`, submit the form, and verify the action JSON on stdout; send an invalid Express file and verify the pane stays unchanged and the exit code is 4
- [ ] 5.2 In Claude Code and in GitHub Copilot CLI, let an agent ask for a confirmation with `ask_user` in Express and verify it receives the answer. Record the results in the pull request
