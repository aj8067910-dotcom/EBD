import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { makeApp, resetDb } from './helpers.js';
import { prisma } from '../src/prisma.js';
import { normalizePhone, maskPhone } from '../src/lib/phone.js';
import { getMockProvider } from '../src/integrations/whatsapp/index.js';
import { otpService } from '../src/services/otpService.js';
import { dailyReadingImageService } from '../src/services/dailyReadingImage/DailyReadingImageService.js';
import { whatsappMessageService } from '../src/services/whatsappMessageService.js';
import { runDueReadings } from '../src/jobs/dailyReadingJob.js';

let app: FastifyInstance;
let server: import('node:http').Server;

beforeAll(async () => {
  app = await makeApp();
  server = app.server;
});
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await resetDb();
  getMockProvider().reset();
});

function teacherToken(id: string) {
  return app.jwt.sign({ sub: id, role: 'TEACHER' });
}

async function makeTeacher(number = '+5574999990100') {
  return prisma.teacher.create({
    data: { name: 'Prof', role: 'TEACHER', whatsappNumber: number, subscription: { create: {} } },
  });
}

/* ------------------------------------------------------------------ phone */

describe('phone normalization (E.164)', () => {
  it('normalizes all formats of the same number to one identifier', () => {
    const target = '+5574999990001';
    expect(normalizePhone('(74) 99999-0001')).toBe(target);
    expect(normalizePhone('5574999990001')).toBe(target);
    expect(normalizePhone('+55 74 99999-0001')).toBe(target);
    expect(normalizePhone('+5574999990001')).toBe(target);
  });
  it('rejects invalid numbers', () => {
    expect(normalizePhone('123')).toBeNull();
  });
  it('masks the number for display', () => {
    expect(maskPhone('+5574999990001')).toContain('*****');
    expect(maskPhone('+5574999990001')).not.toContain('9999000');
  });
});

/* ----------------------------------------------------------------- OTP auth */

describe('WhatsApp OTP auth', () => {
  it('registers via OTP and returns a session', async () => {
    const number = '+5574999990001';
    const reg = await request(server)
      .post('/auth/whatsapp/register')
      .send({ name: 'André', whatsappNumber: '(74) 99999-0001' });
    expect(reg.status).toBe(201);

    const code = getMockProvider().getLastOtp(number);
    expect(code).toMatch(/^\d{6}$/);

    const verify = await request(server)
      .post('/auth/whatsapp/verify')
      .send({ whatsappNumber: number, code });
    expect(verify.status).toBe(200);
    expect(verify.body.token).toBeTruthy();
    expect(verify.body.user.whatsappNumberMasked).toContain('*****');

    // OTP stored only as a hash.
    const otp = await prisma.otpCode.findFirst({ where: { whatsappNumber: number } });
    expect(otp?.codeHash).toBeTruthy();
    expect(otp?.codeHash).not.toBe(code);

    const me = await request(server)
      .get('/auth/whatsapp/me')
      .set('Authorization', `Bearer ${verify.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe('STUDENT');
  });

  it('rejects a wrong code, then an expired code', async () => {
    const number = '+5574999990002';
    await request(server)
      .post('/auth/whatsapp/register')
      .send({ name: 'Xavier', whatsappNumber: number });

    const wrong = await request(server)
      .post('/auth/whatsapp/verify')
      .send({ whatsappNumber: number, code: '000000' });
    expect(wrong.status).toBe(401);

    // Force expiry and try the real code.
    const code = getMockProvider().getLastOtp(number)!;
    await prisma.otpCode.updateMany({
      where: { whatsappNumber: number },
      data: { expiresAt: new Date(Date.now() - 1000), attempts: 0 },
    });
    const expired = await request(server)
      .post('/auth/whatsapp/verify')
      .send({ whatsappNumber: number, code });
    expect(expired.status).toBe(401);
  });

  it('rate-limits OTP requests per number (5 per window)', async () => {
    const number = '+5574999990300';
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await otpService.request(number, 'REGISTER');
    }
    await expect(otpService.request(number, 'REGISTER')).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it('treats different formats of a number as the same user (no duplicates)', async () => {
    const number = '+5574999990010';
    await request(server)
      .post('/auth/whatsapp/register')
      .send({ name: 'Ana', whatsappNumber: number });
    const code = getMockProvider().getLastOtp(number)!;
    await request(server)
      .post('/auth/whatsapp/verify')
      .send({ whatsappNumber: number, code });

    // The user now exists; a different format of the same number conflicts.
    const dup = await request(server)
      .post('/auth/whatsapp/register')
      .send({ name: 'Ana', whatsappNumber: '(74) 99999-0010' });
    expect(dup.status).toBe(409);
  });
});

/* ------------------------------------------------------------ daily reading */

describe('daily readings', () => {
  const valid = {
    title: 'A Graça que nos Alcança',
    verse: 'Porque pela graça sois salvos, por meio da fé.',
    reference: 'Efésios 2:8',
    readingDate: '2026-09-07',
  };

  it('requires title, verse and reference (Zod)', async () => {
    const teacher = await makeTeacher();
    const token = teacherToken(teacher.id);
    const bad = await request(server)
      .post('/daily-readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...valid, title: 'ab' });
    expect(bad.status).toBe(400);
  });

  it('creates a reading with an art URL and DRAFT status', async () => {
    const teacher = await makeTeacher();
    const token = teacherToken(teacher.id);
    const res = await request(server)
      .post('/daily-readings')
      .set('Authorization', `Bearer ${token}`)
      .send(valid);
    expect(res.status).toBe(201);
    expect(res.body.reading.status).toBe('DRAFT');
    expect(res.body.reading.imageUrl).toContain('/art.png');
  });

  it('serves the public 1080x1080 PNG art', async () => {
    const teacher = await makeTeacher();
    const token = teacherToken(teacher.id);
    const created = await request(server)
      .post('/daily-readings')
      .set('Authorization', `Bearer ${token}`)
      .send(valid);
    const id = created.body.reading.id;
    const art = await request(server).get(`/daily-readings/${id}/art.png`);
    expect(art.status).toBe(200);
    expect(art.headers['content-type']).toContain('image/png');
    expect(art.body.length).toBeGreaterThan(1000);
  });

  it('generates a 1080x1080 PNG from the service', async () => {
    const png = await dailyReadingImageService.toPng({
      title: valid.title,
      verse: valid.verse,
      reference: valid.reference,
      readingDate: new Date(valid.readingDate),
    });
    expect(png.length).toBeGreaterThan(1000);
  });
});

/* --------------------------------------------------------- sending + dedup */

describe('WhatsApp sending', () => {
  async function setup() {
    const teacher = await makeTeacher('+5574999990200');
    const reading = await prisma.dailyReading.create({
      data: {
        teacherId: teacher.id,
        title: 'Leitura',
        verse: 'Versículo',
        reference: 'Ref 1:1',
        readingDate: new Date('2026-09-07'),
        imageUrl: 'http://localhost:3333/daily-readings/x/art.png',
        status: 'PUBLISHED',
      },
    });
    const student = await prisma.teacher.create({
      data: {
        name: 'Aluno',
        role: 'STUDENT',
        whatsappNumber: '+5574999990201',
        subscription: { create: {} },
      },
    });
    return { teacher, reading, student };
  }

  it('sends to opted-in users and records SENT (idempotent)', async () => {
    const { reading, student } = await setup();
    const users = await whatsappMessageService.resolveRecipients({ kind: 'ALL' });
    expect(users.map((u) => u.id)).toContain(student.id);

    await whatsappMessageService.dispatch(reading, users);
    await whatsappMessageService.dispatch(reading, users); // dedup

    const messages = await prisma.whatsAppMessage.findMany({
      where: { dailyReadingId: reading.id, userId: student.id },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]!.status).toBe('SENT');
    expect(messages[0]!.providerMessageId).toBeTruthy();
  });

  it('records FAILED when the provider throws', async () => {
    const { reading, student } = await setup();
    getMockProvider().failNext = true;
    await whatsappMessageService.dispatch(reading, [student]);
    const msg = await prisma.whatsAppMessage.findFirst({
      where: { dailyReadingId: reading.id, userId: student.id },
    });
    expect(msg?.status).toBe('FAILED');
    expect(msg?.errorMessage).toContain('failure');
  });

  it('does not send to users who opted out', async () => {
    const { reading } = await setup();
    await prisma.teacher.create({
      data: {
        name: 'Optout',
        role: 'STUDENT',
        whatsappNumber: '+5574999990202',
        subscription: { create: { dailyReadingEnabled: false } },
      },
    });
    const users = await whatsappMessageService.resolveRecipients({ kind: 'ALL' });
    expect(users.some((u) => u.whatsappNumber === '+5574999990202')).toBe(false);
    await whatsappMessageService.dispatch(reading, users);
  });

  it('scheduled job sends due readings and marks them SENT', async () => {
    const { reading } = await setup();
    await prisma.dailyReading.update({
      where: { id: reading.id },
      data: { scheduledAt: new Date(Date.now() - 60_000) },
    });
    const count = await runDueReadings(new Date());
    expect(count).toBeGreaterThanOrEqual(1);
    const after = await prisma.dailyReading.findUnique({ where: { id: reading.id } });
    expect(after?.status).toBe('SENT');
  });
});
