import { prisma } from '../prisma.js';

interface MomentWriteData {
  lessonId: string;
  order: number;
  type: string;
  title: string;
  config: string;
  correctOptionIds: string | null;
  points: number;
  isPreClass: boolean;
}

export const momentRepo = {
  findById(id: string) {
    return prisma.moment.findUnique({ where: { id } });
  },

  listByLesson(lessonId: string) {
    return prisma.moment.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' },
    });
  },

  maxOrder(lessonId: string) {
    return prisma.moment.aggregate({
      where: { lessonId },
      _max: { order: true },
    });
  },

  create(data: MomentWriteData) {
    return prisma.moment.create({ data });
  },

  update(id: string, data: Omit<MomentWriteData, 'lessonId'>) {
    return prisma.moment.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.moment.delete({ where: { id } });
  },

  /** Apply a new order to a set of moments in one transaction. */
  reorder(updates: { id: string; order: number }[]) {
    return prisma.$transaction(
      updates.map((u) =>
        prisma.moment.update({ where: { id: u.id }, data: { order: u.order } }),
      ),
    );
  },
};
