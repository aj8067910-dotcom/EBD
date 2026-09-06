import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import {
  makeApp,
  resetDb,
  validPeerInstructionMoment,
  validPollMoment,
  validReflectionMoment,
} from './helpers.js';

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
});

async function registerTeacher(email = 'prof@test.dev') {
  const res = await request(server)
    .post('/auth/register')
    .send({ name: 'Prof Teste', email, password: 'senha1234' });
  return res;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('auth', () => {
  it('registers and returns a token + teacher', async () => {
    const res = await registerTeacher();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.teacher.email).toBe('prof@test.dev');
  });

  it('rejects duplicate email with 409', async () => {
    await registerTeacher();
    const res = await registerTeacher();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('logs in and reaches /auth/me with the token', async () => {
    await registerTeacher();
    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'prof@test.dev', password: 'senha1234' });
    expect(login.status).toBe(200);
    const me = await request(server).get('/auth/me').set(bearer(login.body.token));
    expect(me.status).toBe(200);
    expect(me.body.teacher.email).toBe('prof@test.dev');
  });

  it('rejects /auth/me without a token', async () => {
    const res = await request(server).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects wrong password with 401', async () => {
    await registerTeacher();
    const res = await request(server)
      .post('/auth/login')
      .send({ email: 'prof@test.dev', password: 'errada' });
    expect(res.status).toBe(401);
  });
});

describe('lessons + moments', () => {
  it('creates a lesson with 3 moments, reorders them', async () => {
    const reg = await registerTeacher();
    const token = reg.body.token;

    const lessonRes = await request(server)
      .post('/lessons')
      .set(bearer(token))
      .send({ title: 'Filho Pródigo', bibleReference: 'Lucas 15' });
    expect(lessonRes.status).toBe(201);
    const lessonId = lessonRes.body.lesson.id;

    const m1 = await request(server)
      .post(`/lessons/${lessonId}/moments`)
      .set(bearer(token))
      .send(validPollMoment);
    const m2 = await request(server)
      .post(`/lessons/${lessonId}/moments`)
      .set(bearer(token))
      .send(validPeerInstructionMoment);
    const m3 = await request(server)
      .post(`/lessons/${lessonId}/moments`)
      .set(bearer(token))
      .send(validReflectionMoment);
    expect([m1.status, m2.status, m3.status]).toEqual([201, 201, 201]);

    // Peer Instruction persists correctOptionIds parsed back to an array.
    expect(m2.body.moment.correctOptionIds).toEqual(['b']);

    const lesson = await request(server)
      .get(`/lessons/${lessonId}`)
      .set(bearer(token));
    expect(lesson.body.lesson.moments.map((m: { order: number }) => m.order)).toEqual([
      0, 1, 2,
    ]);

    // Reverse the order.
    const reordered = await request(server)
      .patch(`/lessons/${lessonId}/moments/reorder`)
      .set(bearer(token))
      .send({ orderedIds: [m3.body.moment.id, m2.body.moment.id, m1.body.moment.id] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.moments[0].id).toBe(m3.body.moment.id);
    expect(reordered.body.moments[0].order).toBe(0);
  });

  it('rejects invalid moment config with 400', async () => {
    const reg = await registerTeacher();
    const token = reg.body.token;
    const lessonRes = await request(server)
      .post('/lessons')
      .set(bearer(token))
      .send({ title: 'Aula', bibleReference: 'Ref' });
    const lessonId = lessonRes.body.lesson.id;

    const bad = await request(server)
      .post(`/lessons/${lessonId}/moments`)
      .set(bearer(token))
      .send({
        type: 'POLL',
        title: 'Enquete quebrada',
        points: 0,
        // Only one option — POLL requires at least two.
        config: { question: 'Q?', options: [{ id: 'a', text: 'A' }] },
      });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('duplicates a lesson with its moments', async () => {
    const reg = await registerTeacher();
    const token = reg.body.token;
    const lessonRes = await request(server)
      .post('/lessons')
      .set(bearer(token))
      .send({ title: 'Original', bibleReference: 'Ref' });
    const lessonId = lessonRes.body.lesson.id;
    await request(server)
      .post(`/lessons/${lessonId}/moments`)
      .set(bearer(token))
      .send(validPollMoment);

    const dup = await request(server)
      .post(`/lessons/${lessonId}/duplicate`)
      .set(bearer(token));
    expect(dup.status).toBe(201);
    expect(dup.body.lesson.title).toContain('cópia');
    expect(dup.body.lesson.moments).toHaveLength(1);
  });
});

describe('rooms', () => {
  async function setupRoom() {
    const reg = await registerTeacher();
    const token = reg.body.token;
    const lessonRes = await request(server)
      .post('/lessons')
      .set(bearer(token))
      .send({ title: 'Aula ao Vivo', bibleReference: 'Lucas 15' });
    const lessonId = lessonRes.body.lesson.id;
    const roomRes = await request(server)
      .post('/rooms')
      .set(bearer(token))
      .send({ lessonId });
    return { token, lessonId, room: roomRes.body.room };
  }

  it('creates a room with a valid 6-char code', async () => {
    const { room } = await setupRoom();
    expect(room.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(room.status).toBe('WAITING');
  });

  it('exposes public room info without auth', async () => {
    const { room } = await setupRoom();
    const pub = await request(server).get(`/rooms/${room.code}/public`);
    expect(pub.status).toBe(200);
    expect(pub.body).toMatchObject({
      exists: true,
      status: 'WAITING',
      lessonTitle: 'Aula ao Vivo',
      teamsEnabled: false,
    });
  });

  it('reports non-existent room publicly as exists:false', async () => {
    const pub = await request(server).get('/rooms/ABCDEF/public');
    expect(pub.status).toBe(200);
    expect(pub.body.exists).toBe(false);
  });

  it('ends the room and produces a report (JSON + CSV)', async () => {
    const { token, room } = await setupRoom();
    const end = await request(server)
      .post(`/rooms/${room.code}/end`)
      .set(bearer(token));
    expect(end.status).toBe(200);
    expect(end.body.room.status).toBe('ENDED');

    const report = await request(server)
      .get(`/rooms/${room.id}/report`)
      .set(bearer(token));
    expect(report.status).toBe(200);
    expect(report.body.report.room.code).toBe(room.code);

    const csv = await request(server)
      .get(`/rooms/${room.id}/report.csv`)
      .set(bearer(token));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('MOMENTOS');
  });
});

describe('pre-class (Just-in-Time Teaching)', () => {
  it('serves pre-class moments by token and accepts a response', async () => {
    const reg = await registerTeacher();
    const token = reg.body.token;
    const lessonRes = await request(server)
      .post('/lessons')
      .set(bearer(token))
      .send({ title: 'Pré-aula', bibleReference: 'Ref' });
    const lessonId = lessonRes.body.lesson.id;
    const preClassToken = lessonRes.body.lesson.preClassToken;

    const momentRes = await request(server)
      .post(`/lessons/${lessonId}/moments`)
      .set(bearer(token))
      .send({ ...validPollMoment, isPreClass: true });
    const momentId = momentRes.body.moment.id;

    const publicView = await request(server).get(
      `/lessons/${lessonId}/preclass?token=${preClassToken}`,
    );
    expect(publicView.status).toBe(200);
    expect(publicView.body.moments).toHaveLength(1);
    expect(publicView.body.moments[0].correctOptionIds).toBeNull();

    const submit = await request(server)
      .post(`/lessons/${lessonId}/preclass?token=${preClassToken}`)
      .send({
        nickname: 'Aluno',
        momentId,
        payload: { type: 'POLL', optionIds: ['y'] },
      });
    expect(submit.status).toBe(201);

    const summary = await request(server)
      .get(`/lessons/${lessonId}/preclass/summary`)
      .set(bearer(token));
    expect(summary.status).toBe(200);
    expect(summary.body.moments[0].responseCount).toBe(1);
  });

  it('rejects an invalid pre-class token', async () => {
    const reg = await registerTeacher();
    const token = reg.body.token;
    const lessonRes = await request(server)
      .post('/lessons')
      .set(bearer(token))
      .send({ title: 'X', bibleReference: 'Y' });
    const lessonId = lessonRes.body.lesson.id;
    const res = await request(server).get(
      `/lessons/${lessonId}/preclass?token=wrong`,
    );
    expect(res.status).toBe(404);
  });
});
