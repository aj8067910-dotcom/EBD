import { z } from 'zod';

/**
 * The nine activity ("moment") types available in the classroom, each backed
 * by a distinct pedagogical strategy (see docs / PARTE 0 catalogue).
 */
export const MomentType = {
  /** Simple multiple-choice poll (no correct answer). */
  POLL: 'POLL',
  /** Mazur Peer Instruction: vote -> discuss -> revote -> reveal. */
  PEER_INSTRUCTION: 'PEER_INSTRUCTION',
  /** Open-ended Think-Pair-Share question. */
  OPEN_QUESTION: 'OPEN_QUESTION',
  /** One word per student -> word cloud. */
  WORD_CLOUD: 'WORD_CLOUD',
  /** Team quiz with per-question timer and team scoring. */
  QUIZ_TEAM: 'QUIZ_TEAM',
  /** Students tap the passage fragment that struck them most (heatmap). */
  VERSE_HIGHLIGHT: 'VERSE_HIGHLIGHT',
  /** Always-on anonymous question wall. */
  QUESTION_WALL: 'QUESTION_WALL',
  /** Closing reflection: "one thing I'll apply this week". */
  REFLECTION: 'REFLECTION',
  /** Visible countdown timer for group discussions. */
  TIMER: 'TIMER',
} as const;
export type MomentType = (typeof MomentType)[keyof typeof MomentType];

/**
 * Lifecycle phase of a moment. The exact transitions allowed depend on the
 * moment type and are enforced by the realtime moment engine.
 */
export const MomentPhase = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  DISCUSS: 'DISCUSS',
  REOPEN: 'REOPEN',
  CLOSED: 'CLOSED',
  REVEALED: 'REVEALED',
} as const;
export type MomentPhase = (typeof MomentPhase)[keyof typeof MomentPhase];

export const momentTypeSchema = z.nativeEnum(MomentType);
export const momentPhaseSchema = z.nativeEnum(MomentPhase);

/* --------------------------------------------------------------------------
 * Option / question building blocks
 * ------------------------------------------------------------------------ */

export const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(280),
});
export type Option = z.infer<typeof optionSchema>;

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(280),
  options: z.array(optionSchema).min(2).max(6),
  correctId: z.string().min(1),
  seconds: z.number().int().min(5).max(600),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

/* --------------------------------------------------------------------------
 * Per-type config schemas
 * ------------------------------------------------------------------------ */

export const pollConfigSchema = z.object({
  question: z.string().min(1).max(280),
  options: z.array(optionSchema).min(2).max(8),
  allowMultiple: z.boolean().default(false),
});

export const peerInstructionConfigSchema = z.object({
  question: z.string().min(1).max(280),
  options: z.array(optionSchema).min(2).max(8),
  allowMultiple: z.boolean().default(false),
  /** Seconds allotted to the DISCUSS phase (defaults to 150 in the engine). */
  discussSeconds: z.number().int().min(30).max(600).optional(),
});

export const openQuestionConfigSchema = z.object({
  prompt: z.string().min(1).max(280),
  anonymous: z.boolean().default(true),
  requireApproval: z.boolean().default(true),
});

export const reflectionConfigSchema = openQuestionConfigSchema;

export const wordCloudConfigSchema = z.object({
  prompt: z.string().min(1).max(280),
  maxWords: z.literal(1).default(1),
});

export const quizTeamConfigSchema = z.object({
  questions: z.array(quizQuestionSchema).min(3).max(10),
});

export const verseHighlightConfigSchema = z.object({
  reference: z.string().min(1).max(120),
  /** The passage text is pasted by the teacher (no copyrighted text shipped). */
  text: z.string().min(1).max(4000),
});

export const questionWallConfigSchema = z.object({
  prompt: z.string().max(280).default('Envie sua dúvida'),
});

export const timerConfigSchema = z.object({
  seconds: z.number().int().min(5).max(3600),
  label: z.string().max(120).default(''),
});

/**
 * Discriminated union of every moment configuration, keyed by `type`.
 * Used both when creating moments (validating `config`) and when serialising.
 */
export const momentConfigByType = {
  [MomentType.POLL]: pollConfigSchema,
  [MomentType.PEER_INSTRUCTION]: peerInstructionConfigSchema,
  [MomentType.OPEN_QUESTION]: openQuestionConfigSchema,
  [MomentType.WORD_CLOUD]: wordCloudConfigSchema,
  [MomentType.QUIZ_TEAM]: quizTeamConfigSchema,
  [MomentType.VERSE_HIGHLIGHT]: verseHighlightConfigSchema,
  [MomentType.QUESTION_WALL]: questionWallConfigSchema,
  [MomentType.REFLECTION]: reflectionConfigSchema,
  [MomentType.TIMER]: timerConfigSchema,
} as const;

export type PollConfig = z.infer<typeof pollConfigSchema>;
export type PeerInstructionConfig = z.infer<typeof peerInstructionConfigSchema>;
export type OpenQuestionConfig = z.infer<typeof openQuestionConfigSchema>;
export type ReflectionConfig = z.infer<typeof reflectionConfigSchema>;
export type WordCloudConfig = z.infer<typeof wordCloudConfigSchema>;
export type QuizTeamConfig = z.infer<typeof quizTeamConfigSchema>;
export type VerseHighlightConfig = z.infer<typeof verseHighlightConfigSchema>;
export type QuestionWallConfig = z.infer<typeof questionWallConfigSchema>;
export type TimerConfig = z.infer<typeof timerConfigSchema>;

/* --------------------------------------------------------------------------
 * CreateMomentDTO — discriminated union by moment type
 * ------------------------------------------------------------------------ */

const baseMomentFields = {
  title: z.string().min(1).max(160),
  points: z.number().int().min(0).max(1000).default(0),
  isPreClass: z.boolean().default(false),
  order: z.number().int().min(0).optional(),
};

/** Correct option ids for gradable moments (Peer Instruction). */
const correctOptionIdsField = z.array(z.string().min(1)).optional();

export const createMomentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(MomentType.POLL),
    ...baseMomentFields,
    config: pollConfigSchema,
  }),
  z.object({
    type: z.literal(MomentType.PEER_INSTRUCTION),
    ...baseMomentFields,
    config: peerInstructionConfigSchema,
    correctOptionIds: correctOptionIdsField,
  }),
  z.object({
    type: z.literal(MomentType.OPEN_QUESTION),
    ...baseMomentFields,
    config: openQuestionConfigSchema,
  }),
  z.object({
    type: z.literal(MomentType.WORD_CLOUD),
    ...baseMomentFields,
    config: wordCloudConfigSchema,
  }),
  z.object({
    type: z.literal(MomentType.QUIZ_TEAM),
    ...baseMomentFields,
    config: quizTeamConfigSchema,
  }),
  z.object({
    type: z.literal(MomentType.VERSE_HIGHLIGHT),
    ...baseMomentFields,
    config: verseHighlightConfigSchema,
  }),
  z.object({
    type: z.literal(MomentType.QUESTION_WALL),
    ...baseMomentFields,
    config: questionWallConfigSchema,
  }),
  z.object({
    type: z.literal(MomentType.REFLECTION),
    ...baseMomentFields,
    config: reflectionConfigSchema,
  }),
  z.object({
    type: z.literal(MomentType.TIMER),
    ...baseMomentFields,
    config: timerConfigSchema,
  }),
]);
export type CreateMomentDTO = z.infer<typeof createMomentSchema>;

/** Partial update of an existing moment (same shapes, all optional-ish). */
export const updateMomentSchema = createMomentSchema;
export type UpdateMomentDTO = z.infer<typeof updateMomentSchema>;

/* --------------------------------------------------------------------------
 * SubmitAnswerDTO — discriminated union by moment type
 * ------------------------------------------------------------------------ */

export const submitAnswerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(MomentType.POLL),
    optionIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal(MomentType.PEER_INSTRUCTION),
    optionIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal(MomentType.OPEN_QUESTION),
    text: z.string().min(1).max(280),
  }),
  z.object({
    type: z.literal(MomentType.REFLECTION),
    text: z.string().min(1).max(280),
  }),
  z.object({
    type: z.literal(MomentType.WORD_CLOUD),
    word: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal(MomentType.QUIZ_TEAM),
    questionId: z.string().min(1),
    optionId: z.string().min(1),
    /** Client timestamp (ms) used for the linear speed bonus. */
    answeredAtMs: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal(MomentType.VERSE_HIGHLIGHT),
    wordIndices: z.array(z.number().int().nonnegative()).min(1).max(200),
  }),
]);
export type SubmitAnswerDTO = z.infer<typeof submitAnswerSchema>;
