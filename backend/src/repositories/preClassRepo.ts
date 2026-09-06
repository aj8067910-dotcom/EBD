import { prisma } from '../prisma.js';

export const preClassRepo = {
  create(data: {
    lessonId: string;
    nickname: string;
    momentId: string;
    payload: string;
  }) {
    return prisma.preClassResponse.create({ data });
  },

  listByLesson(lessonId: string) {
    return prisma.preClassResponse.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'asc' },
    });
  },
};
