import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connectRaw, socketDir, type RawClient } from '../../test/socket.js';
import { FakeRenderer } from '../../test/renderer.js';
import { CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { PaneServer } from './server.js';

let dir: { dir: string; remove: () => void };
let renderer: FakeRenderer;
let server: PaneServer;
let counts: number[];
let socket: string;
const clients: RawClient[] = [];

beforeEach(async () => {
  dir = socketDir();
  socket = join(dir.dir, 't.sock');
  renderer = new FakeRenderer();
  counts = [];
  server = await PaneServer.listen({
    socket,
    renderer,
    version: '9.9.9',
    onClientCount: (count) => counts.push(count),
  });
});

afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.socket.destroy();
  }
  await server.stop('error');
  dir.remove();
});

async function connect(): Promise<RawClient> {
  const client = await connectRaw(socket);
  clients.push(client);
  await client.next('ready');
  return client;
}

async function roundTrip(client: RawClient, id = 'sync'): Promise<void> {
  client.send({ type: 'ping', id });
  await client.next('pong');
}

describe('PaneServer', () => {
  it('sends ready as the first message', async () => {
    const client = await connectRaw(socket);
    clients.push(client);
    await client.next('ready');
    expect(client.received[0]).toEqual({ type: 'ready', version: '9.9.9', a2uiSpec: '1.0' });
  });

  it('answers a ping to the sender only', async () => {
    const a = await connect();
    const b = await connect();
    a.send({ type: 'ping', id: 'abc' });
    expect(await a.next('pong')).toEqual({ type: 'pong', id: 'abc' });
    await roundTrip(b);
    expect(b.received.filter((m) => m.type === 'pong')).toEqual([{ type: 'pong', id: 'sync' }]);
  });

  it('applies a2ui messages in order, also from one write and from split writes', async () => {
    const client = await connect();
    client.write('{"type":"a2ui","message":{"n":1}}\n{"type":"a2ui","message":{"n":2}}\n');
    client.write('{"type":"a2ui","mes');
    client.write('sage":{"n":3}}\n');
    await roundTrip(client);
    expect(renderer.applied).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it('sends errors to the sender only and keeps the connection open', async () => {
    const a = await connect();
    const b = await connect();
    a.write('{not json\n');
    expect(await a.next('error')).toMatchObject({ source: 'parse' });
    a.send({ type: 'dance' });
    expect(await a.next('error')).toEqual({
      type: 'error',
      source: 'protocol',
      message: 'Unknown message type "dance"',
    });
    a.send({ type: 'a2ui', message: { bad: true } });
    expect(await a.next('error')).toEqual({
      type: 'error',
      source: 'render',
      message: 'Validation failed: bad message',
    });
    await roundTrip(a);
    await roundTrip(b);
    expect(b.received.some((m) => m.type === 'error')).toBe(false);
  });

  it('sends errors before the pong that follows the failing message', async () => {
    const client = await connect();
    client.write(
      `${JSON.stringify({ type: 'a2ui', message: { bad: true } })}\n{"type":"ping","id":"p"}\n`,
    );
    await client.next('pong');
    expect(client.received.slice(1).map((m) => m.type)).toEqual(['error', 'pong']);
  });

  it('sends every action to all clients', async () => {
    const a = await connect();
    const b = await connect();
    renderer.press({ userMessage: 'Sent' });
    const expected = {
      type: 'action',
      name: 'submit',
      surfaceId: 'form',
      sourceComponentId: 'submit',
      timestamp: '2026-11-23T10:00:00.000Z',
      context: { name: 'Ada' },
      userMessage: 'Sent',
    };
    expect(await a.next('action')).toEqual(expected);
    expect(await b.next('action')).toEqual(expected);
  });

  it('clears the renderer', async () => {
    const client = await connect();
    client.send({ type: 'clear' });
    await roundTrip(client);
    expect(renderer.cleared).toBe(1);
  });

  it('stops on close, sends closed with reason client and removes the socket', async () => {
    const a = await connect();
    const b = await connect();
    a.send({ type: 'close' });
    expect(await a.next('closed')).toEqual({ type: 'closed', reason: 'client' });
    expect(await b.next('closed')).toEqual({ type: 'closed', reason: 'client' });
    await Promise.all([a.closed, b.closed]);
    await server.stop('client');
    expect(existsSync(socket)).toBe(false);
  });

  it('reports the client count', async () => {
    const client = await connect();
    await connect();
    client.socket.destroy();
    await client.closed;
    await expect.poll(() => counts).toEqual([1, 2, 1]);
    expect(server.clientCount).toBe(1);
  });

  it('rejects an oversized line, closes that connection and keeps others', async () => {
    const big = await connect();
    const other = await connect();
    big.write(Buffer.alloc(5 * 1024 * 1024, 0x61));
    expect(await big.next('error')).toMatchObject({ source: 'protocol' });
    await big.closed;
    await roundTrip(other);
  });

  it('drops a client that does not read', async () => {
    const slow = await connect();
    const other = await connect();
    slow.socket.pause();
    for (let i = 0; i < 200; i += 1) {
      renderer.press({ context: { blob: 'x'.repeat(64 * 1024) } });
      // Let the reading client drain, as it does between real key presses.
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    // The paused socket does not report the close, so check the server side.
    await expect.poll(() => server.clientCount).toBe(1);
    await roundTrip(other);
  });
});

describe('widget requests', () => {
  const create = (surfaceId = 'x') => ({
    version: PROTOCOL_VERSION,
    createSurface: { surfaceId, catalogId: CATALOG_ID },
  });

  it('answers add, update, list and remove with the request id', async () => {
    const client = await connect();
    client.send({ type: 'add', id: 'a1', width: 12, owner: 'tmux:%3', messages: [create()] });
    expect(await client.next('added')).toEqual({ type: 'added', id: 'a1', widgetId: 'w1' });
    client.send({ type: 'update', id: 'u1', widgetId: 'w1', messages: [] });
    expect(await client.next('updated')).toEqual({ type: 'updated', id: 'u1' });
    client.send({ type: 'list', id: 'l1' });
    expect(await client.next('widgets')).toEqual({
      type: 'widgets',
      id: 'l1',
      widgets: [
        {
          widgetId: 'w1',
          title: null,
          label: null,
          owner: 'tmux:%3',
          width: 12,
          position: 0,
          ended: false,
        },
      ],
    });
    client.send({ type: 'remove', id: 'r1', owner: 'tmux:%3' });
    expect(await client.next('removed')).toEqual({ type: 'removed', id: 'r1', widgetIds: ['w1'] });
  });

  it('answers a failed request with an error of source widget and the same id', async () => {
    const client = await connect();
    client.send({ type: 'update', id: 'u1', widgetId: 'w9', messages: [] });
    expect(await client.next('error')).toEqual({
      type: 'error',
      id: 'u1',
      source: 'widget',
      message: 'widget w9 does not exist',
    });
  });

  it('answers an invalid request with an error of source protocol and the same id', async () => {
    const client = await connect();
    client.send({ type: 'add', id: 'a2', width: 13, messages: [] });
    expect(await client.next('error')).toMatchObject({ id: 'a2', source: 'protocol' });
  });

  it('answers the sender only', async () => {
    const a = await connect();
    const b = await connect();
    a.send({ type: 'add', id: 'a1', messages: [create()] });
    await a.next('added');
    b.send({ type: 'list', id: 'l1' });
    expect(await b.next('widgets')).toMatchObject({ id: 'l1' });
    await roundTrip(b);
    expect(b.received.map(({ type }) => type)).toEqual(['ready', 'widgets', 'pong']);
  });
});
