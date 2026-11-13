import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { authRoutes } from './support/auth-routes';
import { botRoutes, TEST_BOT_TOKEN } from './support/bot-routes';
import { conversationRoutes } from './support/conversation-routes';
import {
  collectEvents,
  listenTestApp,
  realtimeRoutes,
  settle,
  TestSocket,
  waitForCount,
} from './support/realtime-routes';
import { EventsStore } from '../src/realtime/events.store';

describe('Dados de negócio protegidos', () => {
  let app: INestApplication;
  let url: string;
  const sockets: TestSocket[] = [];
  beforeAll(async () => {
    ({ app, url } = await listenTestApp());
  });
  afterEach(() => sockets.splice(0).forEach((socket) => socket.disconnect()));
  afterAll(async () => {
    await app.close();
  });

  it('personaliza o tempo real e revalida o acesso ao reenviar evento antigo', async () => {
    const author = await authRoutes.loggedIn(app);
    const reader = await authRoutes.loggedIn(app);
    const db = app.get(DataSource);
    await db.query('UPDATE people SET has_data_access = true WHERE id = $1', [
      author.person.id,
    ]);
    const channel = await conversationRoutes.createChannel(app);
    const bot = await conversationRoutes.createBot(app, 'Assistente');
    const requestId = await botRoutes.openedRequestId(
      app,
      author.cookie,
      channel.id,
      bot.username,
    );
    await settle(100);
    const cursor = await app.get(EventsStore).currentCursor(author.person.id);
    const a = await realtimeRoutes.connected(url, { token: author.token });
    const b = await realtimeRoutes.connected(url, { token: reader.token });
    sockets.push(a, b);
    const allowed = collectEvents(a, 'message.created');
    const denied = collectEvents(b, 'message.created');
    await request(app.getHttpServer() as App)
      .post(`/v1/bot/requests/${requestId}/reply`)
      .set('Authorization', `Bearer ${TEST_BOT_TOKEN}`)
      .send({ body: 'Receita fictícia: 8123,45.', business_data: true })
      .expect(201);
    await waitForCount(allowed, 1);
    await waitForCount(denied, 1);
    expect(JSON.stringify(allowed)).toContain('8123,45');
    expect(JSON.stringify(denied)).not.toContain('8123,45');
    a.disconnect();
    await db.query('UPDATE people SET has_data_access = false WHERE id = $1', [
      author.person.id,
    ]);
    const replay = realtimeRoutes.socket(url, { token: author.token, cursor });
    sockets.push(replay);
    const received = collectEvents(replay, 'message.created');
    const synced = new Promise<void>((resolve) =>
      replay.once('sync', () => resolve()),
    );
    replay.connect();
    await synced;
    expect(received.some((event) => event.message.business_data)).toBe(true);
    expect(JSON.stringify(received)).not.toContain('8123,45');
  });

  it('recusa a entrega protegida para Pedido de quem não tem acesso', async () => {
    const author = await authRoutes.loggedIn(app);
    const channel = await conversationRoutes.createChannel(app);
    const bot = await conversationRoutes.createBot(app, 'Assistente');
    const id = await botRoutes.openedRequestId(
      app,
      author.cookie,
      channel.id,
      bot.username,
    );
    await request(app.getHttpServer() as App)
      .post(`/v1/bot/requests/${id}/reply`)
      .set('Authorization', `Bearer ${TEST_BOT_TOKEN}`)
      .send({ body: '999,99', business_data: true })
      .expect(403);
  });

  it('entrega os números só ao Membro autorizado e protege a citação', async () => {
    const authorized = await authRoutes.loggedIn(app);
    const denied = await authRoutes.loggedIn(app);
    await app
      .get(DataSource)
      .query('UPDATE people SET has_data_access = true WHERE id = $1', [
        authorized.person.id,
      ]);
    const channel = await conversationRoutes.createChannel(app);
    const bot = await conversationRoutes.createBot(app, 'Assistente');
    const requestId = await botRoutes.openedRequestId(
      app,
      authorized.cookie,
      channel.id,
      bot.username,
    );
    const response = await request(app.getHttpServer() as App)
      .post(`/v1/bot/requests/${requestId}/reply`)
      .set('Authorization', `Bearer ${TEST_BOT_TOKEN}`)
      .send({
        body: 'Faturamento fictício: R$ 12.450,50.',
        business_data: true,
      })
      .expect(201);
    const id = (response.body as { message: { id: string } }).message.id;
    const history = (cookie: string) =>
      request(app.getHttpServer() as App)
        .get(`/v1/conversations/${channel.id}/messages`)
        .set('Cookie', cookie)
        .expect(200);
    expect(JSON.stringify((await history(authorized.cookie)).body)).toContain(
      '12.450,50',
    );
    expect(JSON.stringify((await history(denied.cookie)).body)).not.toContain(
      '12.450,50',
    );
    await request(app.getHttpServer() as App)
      .post(`/v1/conversations/${channel.id}/messages`)
      .set('Cookie', authorized.cookie)
      .send({
        client_id: crypto.randomUUID(),
        body: `Veja o resultado @${denied.person.username}`,
        quoted_message_id: id,
      })
      .expect(201);
    expect(JSON.stringify((await history(denied.cookie)).body)).not.toContain(
      '12.450,50',
    );
    const activity = () =>
      request(app.getHttpServer() as App)
        .get('/v1/activity')
        .set('Cookie', denied.cookie)
        .expect(200);
    const blockedActivity = JSON.stringify((await activity()).body);
    expect(blockedActivity).toContain('Veja o resultado');
    expect(blockedActivity).not.toContain('12.450,50');
    await app
      .get(DataSource)
      .query('UPDATE people SET has_data_access=true WHERE id=$1', [
        denied.person.id,
      ]);
    expect(JSON.stringify((await activity()).body)).toContain('12.450,50');
    await app
      .get(DataSource)
      .query('UPDATE people SET has_data_access=false WHERE id=$1', [
        denied.person.id,
      ]);
    expect(JSON.stringify((await activity()).body)).not.toContain('12.450,50');
    await app
      .get(DataSource)
      .query('UPDATE people SET has_data_access = false WHERE id = $1', [
        authorized.person.id,
      ]);
    expect(
      JSON.stringify((await history(authorized.cookie)).body),
    ).not.toContain('12.450,50');
  });
});
