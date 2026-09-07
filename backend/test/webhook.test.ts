import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { makeApp, resetDb } from './helpers.js';
import { prisma } from '../src/prisma.js';
import { env } from '../src/env.js';

let app: FastifyInstance;
let server: import('node:http').Server;
const APP_SECRET = 'test-app-secret';
const savedSecret = env.WHATSAPP_APP_SECRET;

beforeAll(async () => {
  env.WHATSAPP_APP_SECRET = APP_SECRET; // enable signature validation
  app = await makeApp();
  server = app.server;
});
afterAll(async () => {
  await app.close();
  env.WHATSAPP_APP_SECRET = savedSecret;
});
beforeEach(async () => {
  await resetDb();
});

function sign(body: string, secret = APP_SECRET) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

const payload = JSON.stringify({
  entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.X', status: 'failed', errors: [{ title: 'undeliverable' }] }] } }] }],
});

describe('WhatsApp webhook signature (B-10)', () => {
  it('accepts a request with a valid signature and applies the status', async () => {
    const teacher = await prisma.teacher.create({
      data: { name: 'P', role: 'TEACHER', whatsappNumber: '+5574999996001' },
    });
    const reading = await prisma.dailyReading.create({
      data: {
        teacherId: teacher.id,
        title: 't', verse: 'v', reference: 'r',
        readingDate: new Date('2026-09-07T12:00:00Z'),
        status: 'SENT',
      },
    });
    await prisma.whatsAppMessage.create({
      data: {
        userId: teacher.id,
        dailyReadingId: reading.id,
        type: 'DAILY_READING',
        status: 'SENT',
        providerMessageId: 'wamid.X',
      },
    });

    const res = await request(server)
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', sign(payload))
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const msg = await prisma.whatsAppMessage.findFirst({ where: { providerMessageId: 'wamid.X' } });
    expect(msg?.status).toBe('FAILED');
  });

  it('rejects a missing signature', async () => {
    const res = await request(server)
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(401);
  });

  it('rejects an invalid signature', async () => {
    const res = await request(server)
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', 'sha256=deadbeef')
      .send(payload);
    expect(res.status).toBe(401);
  });

  it('rejects a tampered payload (signature for different bytes)', async () => {
    const goodSig = sign(payload);
    const tampered = payload.replace('failed', 'sent');
    const res = await request(server)
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', goodSig)
      .send(tampered);
    expect(res.status).toBe(401);
  });

  it('rejects a signature made with the wrong secret', async () => {
    const res = await request(server)
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', sign(payload, 'wrong-secret'))
      .send(payload);
    expect(res.status).toBe(401);
  });
});
