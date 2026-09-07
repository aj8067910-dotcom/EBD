import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { makeApp, resetDb } from './helpers.js';
import { prisma } from '../src/prisma.js';

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

function token(id: string, role: string) {
  return app.jwt.sign({ sub: id, role });
}
function bearer(t: string) {
  return { Authorization: `Bearer ${t}` };
}

async function makeUser(role: 'TEACHER' | 'STUDENT', extra: Record<string, unknown> = {}) {
  return prisma.teacher.create({
    data: { name: `${role} user`, role, ...extra },
  });
}

describe('role-based access (B-08)', () => {
  it('STUDENT cannot reach teacher-only areas but can reach their profile', async () => {
    const student = await makeUser('STUDENT');
    const t = token(student.id, 'STUDENT');

    const teacherArea = await request(server).get('/daily-readings').set(bearer(t));
    expect(teacherArea.status).toBe(403);

    const profile = await request(server).get('/profile').set(bearer(t));
    expect(profile.status).toBe(200);
    expect(profile.body.profile.role).toBe('STUDENT');
  });

  it('TEACHER can reach teacher areas and their profile', async () => {
    const teacher = await makeUser('TEACHER');
    const t = token(teacher.id, 'TEACHER');
    expect((await request(server).get('/daily-readings').set(bearer(t))).status).toBe(200);
    expect((await request(server).get('/profile').set(bearer(t))).status).toBe(200);
  });
});

describe('session/role invalidation (B-13)', () => {
  it('a deactivated account is rejected even with a still-valid token', async () => {
    const teacher = await makeUser('TEACHER');
    const t = token(teacher.id, 'TEACHER');
    expect((await request(server).get('/profile').set(bearer(t))).status).toBe(200);

    await prisma.teacher.update({ where: { id: teacher.id }, data: { isActive: false } });
    const after = await request(server).get('/profile').set(bearer(t));
    expect(after.status).toBe(401);
  });

  it('a role downgrade takes effect immediately (token still says TEACHER)', async () => {
    const teacher = await makeUser('TEACHER');
    const t = token(teacher.id, 'TEACHER'); // token minted while a teacher

    expect((await request(server).get('/daily-readings').set(bearer(t))).status).toBe(200);

    await prisma.teacher.update({ where: { id: teacher.id }, data: { role: 'STUDENT' } });
    const after = await request(server).get('/daily-readings').set(bearer(t));
    expect(after.status).toBe(403); // authorized against live DB role, not JWT
  });
});
