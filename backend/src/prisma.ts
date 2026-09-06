import { PrismaClient } from '@prisma/client';

/** Shared PrismaClient singleton for the whole backend process. */
export const prisma = new PrismaClient();
