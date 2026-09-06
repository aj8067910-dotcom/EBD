import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SubmitAnswerDTO } from '@koinonia/shared';
import { useRoomStore } from '../store/useRoomStore.js';
import {
  disconnectSocket,
  getSocket,
  joinRoom,
  submitAnswer,
} from '../realtime/socket.js';
import { loadSession } from '../lib/session.js';
import { Badge, Timer, useToast } from '../ui/index.js';
import { MomentRenderer } from '../moments/student/MomentRenderer.js';
import { WallPanel } from '../moments/student/WallPanel.js';
import type { SubmitResult } from '../moments/student/types.js';

export function StudentRoom() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const connected = useRoomStore((s) => s.connected);
  const roomState = useRoomStore((s) => s.roomState);
  const activeMoment = useRoomStore((s) => s.activeMoment);
  const phase = useRoomStore((s) => s.phase);
  const timer = useRoomStore((s) => s.timer);
  const scores = useRoomStore((s) => s.scores);
  const myTeamId = useRoomStore((s) => s.myTeamId);
  const recordAnswer = useRoomStore((s) => s.recordAnswer);

  const myTeam = scores.find((t) => t.id === myTeamId) ?? null;

  useEffect(() => {
    const session = loadSession();
    if (!session || session.code !== code) {
      navigate(`/join/${code}`, { replace: true });
      return;
    }
    const socket = getSocket();

    const doJoin = async () => {
      const res = await joinRoom(socket, session.code, session.nickname);
      if (!res.ok) {
        toast(res.error?.message ?? 'Não foi possível entrar', 'error');
        navigate(`/join/${code}`, { replace: true });
      }
    };
    void doJoin();
    // Re-join automatically after a reconnection.
    socket.on('connect', doJoin);

    return () => {
      socket.off('connect', doJoin);
      disconnectSocket();
    };
  }, [code, navigate, toast]);

  const submit = async (answer: SubmitAnswerDTO): Promise<SubmitResult> => {
    if (!activeMoment) return { ok: false };
    const res = await submitAnswer(getSocket(), activeMoment.id, answer);
    if (res.ok) {
      recordAnswer(`${activeMoment.id}:${phase}`, answer);
    } else {
      toast(res.error?.message ?? 'Erro ao enviar', 'error');
    }
    return { ok: res.ok, isCorrect: res.data?.isCorrect };
  };

  const socket = getSocket();

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col p-4 pb-24">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">
            {roomState?.lessonTitle ?? 'Carregando…'}
          </p>
          <p className="font-mono text-xs text-muted">Sala {code}</p>
        </div>
        {myTeam && <Badge color={myTeam.color}>{myTeam.name}</Badge>}
      </header>

      {!connected && (
        <div
          className="mb-3 rounded-xl bg-accent-soft px-4 py-2 text-center text-sm text-ink"
          role="status"
        >
          Reconectando…
        </div>
      )}

      {timer?.running && (
        <div className="mb-4 flex justify-center">
          <Timer remaining={timer.remaining} total={timer.total} label={timer.label} />
        </div>
      )}

      <main className="flex-1">
        {activeMoment ? (
          <MomentRenderer
            moment={activeMoment}
            phase={phase}
            teamColor={myTeam?.color ?? null}
            submit={submit}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="h-12 w-12 animate-pulse rounded-full bg-brand-soft" aria-hidden />
            <h2 className="text-xl font-semibold text-ink">
              Aguardando o professor iniciar…
            </h2>
            <p className="text-muted">
              Fique de olho na tela. A próxima atividade aparecerá aqui.
            </p>
          </div>
        )}
      </main>

      <WallPanel socket={socket} />
    </div>
  );
}
