import { prisma } from '../prisma.js';

export const teacherRepo = {
  findByEmail(email: string) {
    return prisma.teacher.findUnique({ where: { email } });
  },
  findById(id: string) {
    return prisma.teacher.findUnique({ where: { id } });
  },
  create(data: { name: string; email: string; passwordHash: string }) {
    return prisma.teacher.create({ data });
  },
};
