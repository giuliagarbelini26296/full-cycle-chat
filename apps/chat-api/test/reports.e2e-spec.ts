import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { authRoutes } from './support/auth-routes';
import { botRoutes, TEST_BOT_TOKEN } from './support/bot-routes';
import { conversationRoutes } from './support/conversation-routes';
import { createTestApp } from './support/create-test-app';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

describe('Relatório protegido', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it.each(['expired', 'cancelled'])(
    'encerra relatório de Pedido %s sem aceitar entrega',
    async (reason) => {
      const owner = await authRoutes.loggedIn(app);
      const db = app.get(DataSource);
      await db.query('UPDATE people SET has_data_access=true WHERE id=$1', [
        owner.person.id,
      ]);
      const channel = await conversationRoutes.createChannel(app);
      const bot = await conversationRoutes.createBot(app, 'Assistente');
      const id = await botRoutes.openedRequestId(
        app,
        owner.cookie,
        channel.id,
        bot.username,
      );
      await request(app.getHttpServer() as App)
        .post(`/v1/bot/requests/${id}/report`)
        .set('Authorization', `Bearer ${TEST_BOT_TOKEN}`)
        .expect(201);
      if (reason === 'expired')
        await db.query(
          "UPDATE reports SET expires_at=now()-interval '1 second' WHERE id=$1",
          [id],
        );
      else
        await db.query(
          "UPDATE agent_requests SET status='cancelled' WHERE id=$1",
          [id],
        );
      const header = {
        Authorization: `Bearer ${process.env.CHAT_WORKER_TOKEN}`,
      };
      await request(app.getHttpServer() as App)
        .get(`/v1/worker/reports/${id}`)
        .set(header)
        .expect(409);
      const response = await request(app.getHttpServer() as App)
        .post(`/v1/worker/reports/${id}/complete`)
        .set(header)
        .send({ status: 'ready' })
        .expect(201);
      expect(response.body).toMatchObject({ status: 'failed' });
    },
  );

  it('assina só para Membro com acesso vigente, bloqueia anônimo e vence o link', async () => {
    const owner = await authRoutes.loggedIn(app);
    const denied = await authRoutes.loggedIn(app);
    const db = app.get(DataSource);
    await db.query('UPDATE people SET has_data_access=true WHERE id=$1', [
      owner.person.id,
    ]);
    const channel = await conversationRoutes.createChannel(app);
    const outsider = await authRoutes.loggedIn(app);
    await db.query('UPDATE people SET has_data_access=true WHERE id=$1', [
      outsider.person.id,
    ]);
    const bot = await conversationRoutes.createBot(app, 'Assistente');
    const id = await botRoutes.openedRequestId(
      app,
      owner.cookie,
      channel.id,
      bot.username,
    );
    await request(app.getHttpServer() as App)
      .post(`/v1/bot/requests/${id}/report`)
      .set('Authorization', `Bearer ${TEST_BOT_TOKEN}`)
      .expect(201);
    const storage = new S3Client({
      endpoint: 'http://s3:8333',
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'fullcycle',
        secretAccessKey: 'fullcycle-secret',
      },
    });
    const key = `reports/${id}.pdf`;
    try {
      await storage.send(
        new PutObjectCommand({
          Bucket: 'reports',
          Key: key,
          Body: '%PDF-1.4\nArquivo fictício para teste de acesso.',
          ContentType: 'application/pdf',
          ACL: 'private',
        }),
      );
      const complete = () =>
        request(app.getHttpServer() as App)
          .post(`/v1/worker/reports/${id}/complete`)
          .set('Authorization', `Bearer ${process.env.CHAT_WORKER_TOKEN}`)
          .send({ status: 'ready' });
      await complete().expect(201);
      await complete().expect(201);
      const download = (cookie: string) =>
        request(app.getHttpServer() as App)
          .get(`/v1/reports/${id}/download`)
          .set('Cookie', cookie);
      await download(denied.cookie).expect(403);
      await download(outsider.cookie).expect(404);
      const signed = await download(owner.cookie).expect(200);
      const url = (signed.body as { url: string }).url;
      expect((await fetch(url)).status).toBe(200);
      expect((await fetch(`http://s3:8333/reports/${key}`)).status).toBe(403);
      const history = await request(app.getHttpServer() as App)
        .get(`/v1/conversations/${channel.id}/messages`)
        .set('Cookie', denied.cookie)
        .expect(200);
      expect(JSON.stringify(history.body)).not.toContain(id);
      await db.query('UPDATE people SET has_data_access=false WHERE id=$1', [
        owner.person.id,
      ]);
      await download(owner.cookie).expect(403);
      await new Promise((resolve) => setTimeout(resolve, 2100));
      expect((await fetch(url)).status).toBe(403);
    } finally {
      await storage.send(
        new DeleteObjectCommand({ Bucket: 'reports', Key: key }),
      );
      storage.destroy();
    }
  });

  it('inicia uma vez, impede download antecipado e separa a credencial de Worker', async () => {
    const member = await authRoutes.loggedIn(app);
    await app
      .get(DataSource)
      .query('UPDATE people SET has_data_access=true WHERE id=$1', [
        member.person.id,
      ]);
    const channel = await conversationRoutes.createChannel(app);
    const bot = await conversationRoutes.createBot(app, 'Assistente');
    const id = await botRoutes.openedRequestId(
      app,
      member.cookie,
      channel.id,
      bot.username,
    );
    const start = () =>
      request(app.getHttpServer() as App)
        .post(`/v1/bot/requests/${id}/report`)
        .set('Authorization', `Bearer ${TEST_BOT_TOKEN}`);
    const first = await start().expect(201);
    const second = await start().expect(201);
    expect(second.body).toEqual(first.body);
    await request(app.getHttpServer() as App)
      .get(`/v1/reports/${id}/download`)
      .set('Cookie', member.cookie)
      .expect(409);
    await request(app.getHttpServer() as App)
      .post(`/v1/worker/reports/${id}/complete`)
      .set('Authorization', `Bearer ${TEST_BOT_TOKEN}`)
      .send({ status: 'failed' })
      .expect(401);
    await request(app.getHttpServer() as App)
      .post(`/v1/worker/reports/${id}/complete`)
      .set('Authorization', `Bearer ${process.env.CHAT_WORKER_TOKEN}`)
      .send({ status: 'failed', body: 'Texto que não deve aparecer' })
      .expect(201);
    const history = await request(app.getHttpServer() as App)
      .get(`/v1/conversations/${channel.id}/messages`)
      .set('Cookie', member.cookie)
      .expect(200);
    const messages = (
      history.body as {
        messages: { report?: { status: string }; body: string }[];
      }
    ).messages.filter((m) => m.report);
    expect(messages).toHaveLength(1);
    expect(messages[0].report?.status).toBe('failed');
    expect(JSON.stringify(history.body)).not.toContain(
      'Texto que não deve aparecer',
    );
  });
});
