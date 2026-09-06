import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../../store/useRoomStore.js';
import { connectHost, disconnectSocket, getSocket, host } from '../../realtime/socket.js';
import { getToken } from '../../api/client.js';
import { useEndRoom, useRoomDetail } from '../../api/teacherHooks.js';
import { Button, Timer } from '../../ui/index.js';
import { RoteiroColumn } from './live/RoteiroColumn.js';
import { ControlColumn } from './live/ControlColumn.js';
import { WallColumn } from './live/WallColumn.js';

type Tab = 'roteiro' | 'controle' | 'mural';

export function LivePanel() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { data } = useRoomDetail(code);
  const endRoom = useEndRoom();

  const activeMoment = useRoomStore((s) => s.activeMoment);
  const phase = useRoomStore((s) => s.phase);
  const answeredCount = useRoomStore((s) => s.answeredCount);
  const participantCount = useRoomStore((s) => s.participantCount);
  const results = useRoomStore((s) => s.results);
  const scores = useRoomStore((s) => s.scores);
  const wall = useRoomStore((s) => s.wall);
  const timer = useRoomStore((s) => s.timer);

  const [tab, setTab] = useState<Tab>('controle');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/teacher/login', { replace: true });
      return;
    }
    connectHost(token, code);
    return () => disconnectSocket();
  }, [code, navigate]);

  const socket = getSocket();
  const moments = data?.lesson.moments ?? [];
  const teams = scores.length > 0 ? scores : (data?.teams ?? []);

  const end = async () => {
    await endRoom.mutateAsync(code);
    if (data?.room.id) navigate(`/teacher/rooms/${data.room.id}/report`);
    else navigate('/teacher');
  };

  const quickTimer = (minutes: number) =>
    host.startTimer(socket, minutes * 60, `${minutes} min`);

  const columns = {
    roteiro: (
      <RoteiroColumn
        moments={moments}
        activeMomentId={activeMoment?.id ?? null}
        participantCount={participantCount}
        teams={teams}
        socket={socket}
      />
    ),
    controle: (
      <ControlColumn
        activeMoment={activeMoment}
        phase={phase}
        answeredCount={answeredCount}
        participantCount={participantCount}
        results={results}
        socket={socket}
      />
    ),
    mural: <WallColumn wall={wall} socket={socket} />,
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-line p-4">
        <div>
          <h1 className="text-lg font-bold text-ink">{data?.lesson.title ?? 'Aula ao vivo'}</h1>
          <p className="font-mono text-sm text-muted">Sala {code}</p>
        </div>
        {timer?.running && (
          <Timer remaining={timer.remaining} total={timer.total} label={timer.label} />
        )}
      </header>

      {/* Mobile tabs */}
      <div className="flex border-b border-line lg:hidden" role="tablist">
        {(['roteiro', 'controle', 'mural'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize ${
              tab === t ? 'border-b-2 border-brand text-brand' : 'text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Mobile single column */}
      <main className="flex-1 overflow-y-auto p-4 lg:hidden">{columns[tab]}</main>

      {/* Desktop 3 columns */}
      <main className="hidden flex-1 gap-4 p-4 lg:grid lg:grid-cols-[1fr_1.4fr_1fr]">
        <section aria-label="Roteiro" className="overflow-y-auto">
          {columns.roteiro}
        </section>
        <section aria-label="Controle" className="overflow-y-auto">
          {columns.controle}
        </section>
        <section aria-label="Mural" className="overflow-y-auto">
          {columns.mural}
        </section>
      </main>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line p-3">
        <Button
          variant="secondary"
          onClick={() => window.open(`/screen/${code}`, '_blank')}
        >
          Abrir Modo Projetor
        </Button>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 5].map((m) => (
            <Button key={m} variant="ghost" onClick={() => quickTimer(m)}>
              {m}min
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="danger" onClick={end} disabled={endRoom.isPending}>
          Encerrar aula
        </Button>
      </footer>
    </div>
  );
}
