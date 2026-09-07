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
import { dailyReadingService } from '../src/services/dailyReadingService.js';
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

  it('serves the art with an ETag + Cache-Control and honours If-None-Match (B-12)', async () => {
    const teacher = await makeTeacher('+5574999997001');
    const token = teacherToken(teacher.id);
    const created = await request(server)
      .post('/daily-readings')
      .set('Authorization', `Bearer ${token}`)
      .send(valid);
    const id = created.body.reading.id;

    const first = await request(server).get(`/daily-readings/${id}/art.png`);
    expect(first.status).toBe(200);
    expect(first.headers.etag).toBeTruthy();
    expect(first.headers['cache-control']).toContain('public');

    const cached = await request(server)
      .get(`/daily-readings/${id}/art.png`)
      .set('If-None-Match', first.headers.etag);
    expect(cached.status).toBe(304);
  });

  it('freezes the art once a reading has been sent (B-09)', async () => {
    const teacher = await makeTeacher('+5574999997010');
    const token = teacherToken(teacher.id);
    const created = await request(server)
      .post('/daily-readings')
      .set('Authorization', `Bearer ${token}`)
      .send(valid);
    const id = created.body.reading.id;
    await prisma.dailyReading.update({ where: { id }, data: { status: 'SENT' } });

    // Art-changing edit is rejected...
    const blocked = await request(server)
      .put(`/daily-readings/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Um título completamente novo' });
    expect(blocked.status).toBe(409);

    // ...but a non-art field (message) may still be updated.
    const ok = await request(server)
      .put(`/daily-readings/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'observação adicional' });
    expect(ok.status).toBe(200);

    // And a sent reading cannot be hard-deleted (B-20: audit preserved).
    const del = await request(server)
      .delete(`/daily-readings/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(409);
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

/* ---------------------------------------------- B-01: aggregate send status */

describe('daily reading aggregate status (B-01)', () => {
  async function setupReading() {
    const teacher = await makeTeacher('+5574999991000');
    return prisma.dailyReading.create({
      data: {
        teacherId: teacher.id,
        title: 'Leitura',
        verse: 'Versículo',
        reference: 'Ref 1:1',
        readingDate: new Date('2026-09-07'),
        imageUrl: 'https://example.com/daily-readings/x/art.png',
        status: 'PUBLISHED',
      },
    });
  }

  async function makeStudent(n: number) {
    return prisma.teacher.create({
      data: {
        name: `Aluno ${n}`,
        role: 'STUDENT',
        whatsappNumber: `+557499999${String(2000 + n).padStart(4, '0')}`,
        subscription: { create: {} },
      },
    });
  }

  it('2 recipients, both succeed -> SENT', async () => {
    const reading = await setupReading();
    const s1 = await makeStudent(1);
    const s2 = await makeStudent(2);
    await whatsappMessageService.dispatch(reading, [s1, s2]);
    const result = await dailyReadingService.finalizeStatus(reading.id);
    expect(result.status).toBe('SENT');
    expect(result.sent).toBe(2);
    expect(result.reading.sentAt).toBeTruthy();
  });

  it('2 recipients, one fails -> PARTIALLY_SENT', async () => {
    const reading = await setupReading();
    const s1 = await makeStudent(1);
    const s2 = await makeStudent(2);
    getMockProvider().failCount = 1; // first send fails, second succeeds
    await whatsappMessageService.dispatch(reading, [s1, s2]);
    const result = await dailyReadingService.finalizeStatus(reading.id);
    expect(result.status).toBe('PARTIALLY_SENT');
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('2 recipients, both fail -> FAILED (never SENT)', async () => {
    const reading = await setupReading();
    const s1 = await makeStudent(1);
    const s2 = await makeStudent(2);
    getMockProvider().failAll = true;
    await whatsappMessageService.dispatch(reading, [s1, s2]);
    const result = await dailyReadingService.finalizeStatus(reading.id);
    expect(result.status).toBe('FAILED');
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(2);
    const after = await prisma.dailyReading.findUnique({ where: { id: reading.id } });
    expect(after?.status).toBe('FAILED');
    expect(after?.sentAt).toBeNull();
  });

  it('provider unavailable for all recipients -> FAILED', async () => {
    const reading = await setupReading();
    const s1 = await makeStudent(1);
    getMockProvider().failAll = true;
    await whatsappMessageService.dispatch(reading, [s1]);
    const result = await dailyReadingService.finalizeStatus(reading.id);
    expect(result.status).toBe('FAILED');
  });

  it('no recipients -> SENT (nothing to deliver)', async () => {
    const reading = await setupReading();
    await whatsappMessageService.dispatch(reading, []);
    const result = await dailyReadingService.finalizeStatus(reading.id);
    expect(result.status).toBe('SENT');
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('retry of a FAILED reading recovers it to SENT without duplicates', async () => {
    const reading = await setupReading();
    const s1 = await makeStudent(1);
    getMockProvider().failAll = true;
    await whatsappMessageService.dispatch(reading, [s1]);
    let result = await dailyReadingService.finalizeStatus(reading.id);
    expect(result.status).toBe('FAILED');

    // Provider recovers; re-dispatch retries the FAILED message in place.
    getMockProvider().failAll = false;
    await whatsappMessageService.dispatch(reading, [s1]);
    result = await dailyReadingService.finalizeStatus(reading.id);
    expect(result.status).toBe('SENT');

    const messages = await prisma.whatsAppMessage.findMany({
      where: { dailyReadingId: reading.id, userId: s1.id },
    });
    expect(messages).toHaveLength(1); // no duplicate row
    expect(messages[0]!.status).toBe('SENT');
  });

  it('markSending flips a reading to SENDING', async () => {
    const reading = await setupReading();
    await dailyReadingService.markSending(reading.id);
    const after = await prisma.dailyReading.findUnique({ where: { id: reading.id } });
    expect(after?.status).toBe('SENDING');
  });

  it('dashboard aggregates delivery counts in one query (B-19)', async () => {
    const reading = await setupReading();
    const teacherId = reading.teacherId;
    const s1 = await makeStudent(1);
    const s2 = await makeStudent(2);
    const s3 = await makeStudent(3);
    // 2 SENT, 1 FAILED.
    getMockProvider().failCount = 1;
    await whatsappMessageService.dispatch(reading, [s1, s2, s3]);

    const board = await dailyReadingService.dashboard(teacherId);
    const all = [...board.today, ...board.upcoming, ...board.past];
    const row = all.find((r) => r.id === reading.id)!;
    expect(row.sentCount).toBe(2);
    expect(row.failedCount).toBe(1);
  });

  it('concurrent dispatch of the same reading contacts each user once (B-05)', async () => {
    const reading = await setupReading();
    const s1 = await makeStudent(1);
    // Two workers dispatch the same reading to the same user simultaneously.
    await Promise.all([
      whatsappMessageService.dispatch(reading, [s1]),
      whatsappMessageService.dispatch(reading, [s1]),
    ]);
    const messages = await prisma.whatsAppMessage.findMany({
      where: { dailyReadingId: reading.id, userId: s1.id },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]!.status).toBe('SENT');
    // The provider was called exactly once for this recipient.
    const sends = getMockProvider().messages.filter(
      (m) => m.to === s1.whatsappNumber && m.kind === 'daily_reading',
    );
    expect(sends).toHaveLength(1);
  });
});

/* --------------------------------------------- B-04: persisted OTP state */

describe('OTP-backed pending state (B-04)', () => {
  it('persists the registration name on the challenge (no RAM state)', async () => {
    const number = '+5574999995001';
    await request(server)
      .post('/auth/whatsapp/register')
      .send({ name: 'Maria Silva', whatsappNumber: number });

    const otp = await prisma.otpCode.findFirst({ where: { whatsappNumber: number } });
    expect(otp?.name).toBe('Maria Silva');
    expect(otp?.purpose).toBe('REGISTER');

    // Verifying still uses the persisted name (survives a hypothetical restart).
    const code = getMockProvider().getLastOtp(number)!;
    const verify = await request(server)
      .post('/auth/whatsapp/verify')
      .send({ whatsappNumber: number, code });
    expect(verify.status).toBe(200);
    const user = await prisma.teacher.findUnique({ where: { whatsappNumber: number } });
    expect(user?.name).toBe('Maria Silva');
  });

  it('completes a number change via persisted CHANGE_NUMBER challenge', async () => {
    const original = '+5574999995010';
    const user = await prisma.teacher.create({
      data: { name: 'Troca', role: 'STUDENT', whatsappNumber: original, subscription: { create: {} } },
    });
    const newNumber = '+5574999995011';

    const { profileService } = await import('../src/services/profileService.js');
    await profileService.requestNumberChange(user.id, newNumber);

    // The pending target is stored on the challenge, keyed by userId.
    const pending = await prisma.otpCode.findFirst({
      where: { userId: user.id, purpose: 'CHANGE_NUMBER' },
    });
    expect(pending?.whatsappNumber).toBe(newNumber);

    const code = getMockProvider().getLastOtp(newNumber)!;
    await profileService.confirmNumberChange(user.id, code);
    const updated = await prisma.teacher.findUnique({ where: { id: user.id } });
    expect(updated?.whatsappNumber).toBe(newNumber);
  });

  it('rejects a number change to an already-used number without a 500 (B-18)', async () => {
    const other = await prisma.teacher.create({
      data: { name: 'Dono', role: 'STUDENT', whatsappNumber: '+5574999995020' },
    });
    const user = await prisma.teacher.create({
      data: { name: 'Quer', role: 'STUDENT', whatsappNumber: '+5574999995021' },
    });
    const { profileService } = await import('../src/services/profileService.js');
    await expect(
      profileService.requestNumberChange(user.id, other.whatsappNumber!),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
