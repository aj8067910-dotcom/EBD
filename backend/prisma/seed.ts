import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'professor@koinonia.dev';
const DEMO_PASSWORD = 'demo1234';

/**
 * Moment configs use plain object literals matching the shared Zod schemas.
 * String type discriminators mirror the shared `MomentType` enum.
 */
async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const teacher = await prisma.teacher.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      name: 'Professor Demo',
      email: DEMO_EMAIL,
      passwordHash,
    },
  });

  // Start from a clean demo lesson each run so the seed is idempotent.
  await prisma.lesson.deleteMany({
    where: { teacherId: teacher.id, title: { startsWith: 'Parábola do Filho Pródigo' } },
  });

  const lesson = await prisma.lesson.create({
    data: {
      teacherId: teacher.id,
      title: 'Parábola do Filho Pródigo — Lucas 15',
      bibleReference: 'Lucas 15:11-32',
      date: new Date(),
      notes:
        'Aula sobre arrependimento, graça e a alegria do Pai. Objetivo: perceber o coração do Pai que corre ao encontro do filho.',
    },
  });

  const momentDefs = [
      {
        lessonId: lesson.id,
        order: 0,
        type: 'QUIZ_TEAM',
        title: 'Revisão relâmpago',
        points: 100,
        isPreClass: false,
        config: {
          questions: [
            {
              id: 'q1',
              text: 'Em qual evangelho está a Parábola do Filho Pródigo?',
              options: [
                { id: 'a', text: 'Mateus' },
                { id: 'b', text: 'Marcos' },
                { id: 'c', text: 'Lucas' },
                { id: 'd', text: 'João' },
              ],
              correctId: 'c',
              seconds: 20,
            },
            {
              id: 'q2',
              text: 'O que o filho mais novo pediu ao pai?',
              options: [
                { id: 'a', text: 'A herança' },
                { id: 'b', text: 'Um emprego' },
                { id: 'c', text: 'Uma festa' },
              ],
              correctId: 'a',
              seconds: 20,
            },
            {
              id: 'q3',
              text: 'Quem ficou ressentido no fim da parábola?',
              options: [
                { id: 'a', text: 'O pai' },
                { id: 'b', text: 'O filho mais velho' },
                { id: 'c', text: 'Os servos' },
              ],
              correctId: 'b',
              seconds: 20,
            },
          ],
        },
      },
      {
        lessonId: lesson.id,
        order: 1,
        type: 'WORD_CLOUD',
        title: 'Abertura — uma palavra',
        points: 0,
        config: { prompt: 'Em uma palavra, o que é graça?', maxWords: 1 },
      },
      {
        lessonId: lesson.id,
        order: 2,
        type: 'PEER_INSTRUCTION',
        title: 'O coração do Pai',
        points: 0,
        config: {
          question:
            'Quando o filho pródigo volta, qual atitude do pai melhor revela a graça?',
          options: [
            { id: 'a', text: 'Espera o filho pedir perdão formalmente' },
            { id: 'b', text: 'Corre ao seu encontro e o abraça' },
            { id: 'c', text: 'Aceita o filho apenas como empregado' },
            { id: 'd', text: 'Exige o pagamento da herança gasta' },
          ],
          allowMultiple: false,
          discussSeconds: 150,
        },
        correctOptionIds: ['b'],
      },
      {
        lessonId: lesson.id,
        order: 3,
        type: 'VERSE_HIGHLIGHT',
        title: 'O que mais te marcou?',
        points: 0,
        config: {
          reference: 'Lucas 15:20 (cole aqui sua tradução preferida)',
          // Placeholder paraphrase — teacher pastes the actual translation.
          text: 'E levantando-se foi para o pai. Quando ainda estava longe o pai o viu e se compadeceu e correndo abracou-o e beijou-o.',
        },
      },
      {
        lessonId: lesson.id,
        order: 4,
        type: 'OPEN_QUESTION',
        title: 'Aplicação em duplas',
        points: 0,
        config: {
          prompt:
            'De que forma você pode acolher alguém como o pai acolheu o filho esta semana?',
          anonymous: false,
          requireApproval: true,
        },
      },
      {
        lessonId: lesson.id,
        order: 5,
        type: 'REFLECTION',
        title: 'Fechamento',
        points: 0,
        config: {
          prompt: 'Uma coisa que vou aplicar esta semana:',
          anonymous: false,
          requireApproval: false,
        },
      },
    ];

  await prisma.moment.createMany({
    data: momentDefs.map((m) => ({
      lessonId: m.lessonId,
      order: m.order,
      type: m.type,
      title: m.title,
      points: m.points ?? 0,
      isPreClass: m.isPreClass ?? false,
      // JSON fields are stored as text (SQLite/Postgres portability).
      config: JSON.stringify(m.config),
      correctOptionIds:
        'correctOptionIds' in m ? JSON.stringify(m.correctOptionIds) : null,
    })),
  });

  const momentCount = await prisma.moment.count({ where: { lessonId: lesson.id } });

  console.log('Seed complete.');
  console.log(`  Teacher: ${teacher.email} (senha: ${DEMO_PASSWORD})`);
  console.log(`  Lesson:  ${lesson.title}`);
  console.log(`  Moments: ${momentCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
