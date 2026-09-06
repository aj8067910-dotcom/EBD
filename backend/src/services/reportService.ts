import { prisma } from '../prisma.js';
import { Errors } from '../errors.js';

interface MomentReport {
  id: string;
  type: string;
  title: string;
  totalParticipants: number;
  answerCount: number;
  participationRate: number;
  accuracyBefore?: number;
  accuracyAfter?: number;
  gain?: number;
}

export interface RoomReport {
  room: { id: string; code: string; status: string; createdAt: Date; endedAt: Date | null };
  lesson: { title: string; bibleReference: string };
  participantCount: number;
  teams: { name: string; color: string; score: number }[];
  moments: MomentReport[];
  reflections: { text: string; nickname: string | null }[];
  wall: { text: string; upvotes: number; answered: boolean }[];
}

function accuracy(answers: { isCorrect: boolean | null }[]): number {
  if (answers.length === 0) return 0;
  const correct = answers.filter((a) => a.isCorrect === true).length;
  return correct / answers.length;
}

async function buildReport(roomId: string, teacherId: string): Promise<RoomReport> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      lesson: { include: { moments: { orderBy: { order: 'asc' } } } },
      teams: { orderBy: { score: 'desc' } },
      participants: true,
      answers: true,
      wallQuestions: { orderBy: { upvotes: 'desc' } },
    },
  });
  if (!room) throw Errors.notFound('Sala não encontrada');
  if (room.teacherId !== teacherId) throw Errors.forbidden();

  const participantCount = room.participants.length;
  const answersByMoment = new Map<string, typeof room.answers>();
  for (const a of room.answers) {
    const list = answersByMoment.get(a.momentId) ?? [];
    list.push(a);
    answersByMoment.set(a.momentId, list);
  }

  const moments: MomentReport[] = room.lesson.moments.map((m) => {
    const answers = answersByMoment.get(m.id) ?? [];
    const distinctParticipants = new Set(answers.map((a) => a.participantId)).size;
    const report: MomentReport = {
      id: m.id,
      type: m.type,
      title: m.title,
      totalParticipants: participantCount,
      answerCount: distinctParticipants,
      participationRate:
        participantCount > 0 ? distinctParticipants / participantCount : 0,
    };
    if (m.type === 'PEER_INSTRUCTION') {
      const before = answers.filter((a) => a.phase === 'OPEN');
      const after = answers.filter((a) => a.phase === 'REOPEN');
      report.accuracyBefore = accuracy(before);
      report.accuracyAfter = accuracy(after);
      report.gain = report.accuracyAfter - report.accuracyBefore;
    }
    return report;
  });

  // Reflections: approved (or all) open-ended reflection answers.
  const reflectionMomentIds = new Set(
    room.lesson.moments.filter((m) => m.type === 'REFLECTION').map((m) => m.id),
  );
  const participantsById = new Map(room.participants.map((p) => [p.id, p]));
  const reflections = room.answers
    .filter((a) => reflectionMomentIds.has(a.momentId))
    .map((a) => {
      let text = '';
      try {
        const payload = JSON.parse(a.payload) as { text?: string };
        text = payload.text ?? '';
      } catch {
        text = '';
      }
      return { text, nickname: participantsById.get(a.participantId)?.nickname ?? null };
    });

  return {
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      createdAt: room.createdAt,
      endedAt: room.endedAt,
    },
    lesson: { title: room.lesson.title, bibleReference: room.lesson.bibleReference },
    participantCount,
    teams: room.teams.map((t) => ({ name: t.name, color: t.color, score: t.score })),
    moments,
    reflections,
    wall: room.wallQuestions.map((w) => ({
      text: w.text,
      upvotes: w.upvotes,
      answered: w.answered,
    })),
  };
}

function toCsv(report: RoomReport): string {
  const rows: string[][] = [];
  const esc = (v: string | number | null) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  rows.push(['Sala', report.room.code]);
  rows.push(['Lição', report.lesson.title]);
  rows.push(['Participantes', String(report.participantCount)]);
  rows.push([]);

  rows.push(['MOMENTOS']);
  rows.push([
    'Titulo',
    'Tipo',
    'Respostas',
    'Participacao',
    'AcertoAntes',
    'AcertoDepois',
    'Ganho',
  ]);
  for (const m of report.moments) {
    rows.push([
      m.title,
      m.type,
      String(m.answerCount),
      (m.participationRate * 100).toFixed(0) + '%',
      m.accuracyBefore !== undefined ? (m.accuracyBefore * 100).toFixed(0) + '%' : '',
      m.accuracyAfter !== undefined ? (m.accuracyAfter * 100).toFixed(0) + '%' : '',
      m.gain !== undefined ? (m.gain * 100).toFixed(0) + 'pp' : '',
    ]);
  }
  rows.push([]);

  rows.push(['PLACAR']);
  rows.push(['Equipe', 'Cor', 'Pontos']);
  for (const t of report.teams) rows.push([t.name, t.color, String(t.score)]);
  rows.push([]);

  rows.push(['REFLEXOES']);
  rows.push(['Aluno', 'Resposta']);
  for (const r of report.reflections) rows.push([r.nickname ?? 'Anônimo', r.text]);
  rows.push([]);

  rows.push(['MURAL DE DUVIDAS']);
  rows.push(['Pergunta', 'Votos', 'Respondida']);
  for (const w of report.wall) rows.push([w.text, String(w.upvotes), w.answered ? 'sim' : 'nao']);

  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export const reportService = {
  buildReport,
  toCsv,
};
