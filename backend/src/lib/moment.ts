import type { Moment } from '@prisma/client';
import { momentConfigByType, type MomentType } from '@koinonia/shared';
import { Errors } from '../errors.js';

/** A Moment row with its JSON fields parsed into objects. */
export interface MomentDTO {
  id: string;
  lessonId: string;
  order: number;
  type: MomentType;
  title: string;
  config: unknown;
  correctOptionIds: string[] | null;
  points: number;
  isPreClass: boolean;
}

/**
 * Validate a moment `config` against the shared Zod schema for its type.
 * Returns the parsed (defaults-applied) config or throws a validation error.
 */
export function validateMomentConfig(type: MomentType, config: unknown): unknown {
  const schema = momentConfigByType[type];
  if (!schema) {
    throw Errors.validation(`Tipo de momento inválido: ${type}`);
  }
  const result = schema.safeParse(config);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw Errors.validation(
      `config inválido: ${issue?.path.join('.') ?? ''} ${issue?.message ?? ''}`.trim(),
    );
  }
  return result.data;
}

/** Convert a Prisma Moment row into a MomentDTO with parsed JSON fields. */
export function toMomentDTO(row: Moment): MomentDTO {
  return {
    id: row.id,
    lessonId: row.lessonId,
    order: row.order,
    type: row.type as MomentType,
    title: row.title,
    config: safeParse(row.config),
    correctOptionIds: row.correctOptionIds
      ? (safeParse(row.correctOptionIds) as string[])
      : null,
    points: row.points,
    isPreClass: row.isPreClass,
  };
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
