import { prisma } from '../prisma.js';

export const lessonRepo = {
  listByTeacher(teacherId: string) {
    return prisma.lesson.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { moments: true } } },
    });
  },

  findById(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      include: { moments: { orderBy: { order: 'asc' } } },
    });
  },

  findByPreClassToken(token: string) {
    return prisma.lesson.findUnique({
      where: { preClassToken: token },
      include: { moments: { orderBy: { order: 'asc' } } },
    });
  },

  create(data: {
    teacherId: string;
    title: string;
    bibleReference: string;
    date?: Date | null;
    notes?: string | null;
  }) {
    return prisma.lesson.create({ data });
  },

  update(
    id: string,
    data: {
      title?: string;
      bibleReference?: string;
      date?: Date | null;
      notes?: string | null;
    },
  ) {
    return prisma.lesson.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.lesson.delete({ where: { id } });
  },
};
