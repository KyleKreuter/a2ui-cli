import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeRenderer } from '../../test/renderer.js';
import { socketDir } from '../../test/socket.js';
import { PaneServer } from '../server/server.js';
import { ActionTimeoutError, NoRendererError, PaneClient, RendererClosedError } from './client.js';

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
