import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeRenderer } from '../../test/renderer.js';
import { socketDir } from '../../test/socket.js';
import { PaneServer } from '../server/server.js';
import { CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import {
  ActionTimeoutError,
  NoRendererError,
  PaneClient,
  RendererClosedError,
  RequestError,
} from './client.js';

let tmp: { dir: string; remove: () => void };
let socket: string;
let renderer: FakeRenderer;
let server: PaneServer;
const clients: PaneClient[] = [];

beforeEach(async () => {
  tmp = socketDir();
  socket = join(tmp.dir, 't.sock');
  renderer = new FakeRenderer();
  server = await PaneServer.listen({ socket, renderer, version: '9.9.9' });
});

afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.end();
  }
  await server.stop('error');
  tmp.remove();
});

async function connect(): Promise<PaneClient> {
  const client = await PaneClient.connect(socket);
  clients.push(client);
  return client;
}

describe('PaneClient', () => {
  it('connects and keeps the ready message', async () => {
    const client = await connect();
    expect(client.ready).toEqual({ type: 'ready', version: '9.9.9', a2uiSpec: '1.0' });
  });

  it('rejects with NoRendererError when nothing listens', async () => {
    await expect(PaneClient.connect(join(tmp.dir, 'none.sock'))).rejects.toThrow(NoRendererError);
  });

  it('confirms accepted messages with no errors', async () => {
    const client = await connect();
    client.send({ type: 'a2ui', message: { n: 1 } });
    client.send({ type: 'a2ui', message: { n: 2 } });
    await expect(client.confirm()).resolves.toEqual([]);
    expect(renderer.applied).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it('attributes errors to the messages before the ping', async () => {
    const client = await connect();
    client.send({ type: 'a2ui', message: { bad: true } });
    await expect(client.confirm()).resolves.toEqual(['Validation failed: bad message']);
    client.send({ type: 'a2ui', message: { n: 2 } });
    await expect(client.confirm()).resolves.toEqual([]);
  });

  it('does not see errors of other clients', async () => {
    const a = await connect();
    const b = await connect();
    a.send({ type: 'a2ui', message: { bad: true } });
    await a.confirm();
    await expect(b.confirm()).resolves.toEqual([]);
  });

  it('waits for the next action after its confirm', async () => {
    const client = await connect();
    renderer.press({ name: 'early' });
    await client.confirm();
    const action = client.waitForAction();
    renderer.press({ name: 'submit' });
    await expect(action).resolves.toMatchObject({ type: 'action', name: 'submit' });
  });

  it('keeps an action that arrives before waitForAction', async () => {
    const client = await connect();
    await client.confirm();
    renderer.press({ name: 'first' });
    await client.confirm();
    await expect(client.waitForAction()).resolves.toMatchObject({ name: 'first' });
  });

  it('rejects waitForAction after the timeout', async () => {
    const client = await connect();
    await client.confirm();
    await expect(client.waitForAction(20)).rejects.toThrow(ActionTimeoutError);
  });

  it('rejects waitForAction with the close reason when the renderer stops', async () => {
    const client = await connect();
    await client.confirm();
    const action = client.waitForAction();
    void server.stop('user');
    await expect(action).rejects.toEqual(new RendererClosedError('user'));
  });

  it('reports a lost connection when no closed message arrives', async () => {
    const client = await connect();
    await client.confirm();
    const action = client.waitForAction();
    for (const connection of (server as unknown as { clients: Set<{ destroy(): void }> }).clients) {
      connection.destroy();
    }
    await expect(action).rejects.toEqual(new RendererClosedError('lost'));
  });
});

describe('PaneClient.request', () => {
  const create = {
    version: PROTOCOL_VERSION,
    createSurface: { surfaceId: 'x', catalogId: CATALOG_ID },
  };

  it('resolves with the reply to its request', async () => {
    const client = await connect();
    const added = await client.request({ type: 'add', messages: [create], title: 'Build' });
    expect(added).toMatchObject({ type: 'added', widgetId: 'w1' });
    expect(added.id).not.toBe('');
    await expect(client.request({ type: 'list' })).resolves.toMatchObject({
      type: 'widgets',
      widgets: [{ widgetId: 'w1', title: 'Build' }],
    });
  });

  it('matches concurrent replies by id', async () => {
    const client = await connect();
    const [first, second] = await Promise.all([
      client.request({ type: 'add', messages: [create] }),
      client.request({ type: 'add', messages: [create] }),
    ]);
    expect([first.widgetId, second.widgetId]).toEqual(['w1', 'w2']);
    expect(first.id).not.toBe(second.id);
  });

  it('rejects with RequestError and the message of the renderer', async () => {
    const client = await connect();
    await expect(client.request({ type: 'remove', widgetIds: ['w2'] })).rejects.toEqual(
      new RequestError('widget w2 does not exist'),
    );
  });

  it('rejects with RequestError for a request that the protocol rejects', async () => {
    const client = await connect();
    await expect(
      client.request({ type: 'add', messages: [create], width: 13 }),
    ).rejects.toBeInstanceOf(RequestError);
  });

  it('rejects a request that is still open when the connection ends', async () => {
    const client = await connect();
    await client.confirm();
    // Drop the connection on the server side, so that no reply can arrive.
    for (const connection of (server as unknown as { clients: Set<{ destroy(): void }> }).clients) {
      connection.destroy();
    }
    const pending = client.request({ type: 'list' });
    await expect(pending).rejects.toEqual(new RendererClosedError('lost'));
  });

  it('rejects a request after the renderer stopped', async () => {
    const client = await connect();
    await server.stop('user');
    await client.closed();
    await expect(client.request({ type: 'list' })).rejects.toEqual(new RendererClosedError('user'));
  });
});
