# Spec Delta

## ADDED Requirements

### Requirement: Widget messages
The socket protocol SHALL accept the client messages `add` (`id`, `messages`, optional `width`, `title`, `owner`, `label`), `update` (`id`, `widgetId`, `messages`), `remove` (`id` and either `widgetIds` or `owner`) and `list` (`id`). The server SHALL answer the sender with `added` (`id`, `widgetId`), `updated` (`id`), `removed` (`id`, `widgetIds`) and `widgets` (`id`, `widgets`), or with an `error` that carries the same `id`.

#### Scenario: Add over the socket
- **WHEN** a client sends `{"type":"add","id":"a1","messages":[<createSurface>],"width":12}`
- **THEN** it receives `{"type":"added","id":"a1","widgetId":"w1"}`

#### Scenario: Error with request id
- **WHEN** a client sends `{"type":"update","id":"u1","widgetId":"w9","messages":[]}` and `w9` does not exist
- **THEN** it receives an `error` with `"id":"u1"` that names `w9`
