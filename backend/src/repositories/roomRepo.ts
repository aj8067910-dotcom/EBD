import { prisma } from '../prisma.js';

export const roomRepo = {
  findByCode(code: string) {
    return prisma.room.findUnique({
      where: { code },
      include: { lesson: true, teams: true },
    });
  },

  findById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: { lesson: true, teams: true },
    });
  },

  existsByCode(code: string) {
    return prisma.room.findUnique({ where: { code }, select: { id: true } });
  },

  create(data: { code: string; lessonId: string; teacherId: string }) {
    return prisma.room.create({ data });
  },

  end(id: string) {
    return prisma.room.update({
      where: { id },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  },
};
