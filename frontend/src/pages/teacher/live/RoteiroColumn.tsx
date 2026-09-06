import { useState } from 'react';
import { Badge, Button } from '../../../ui/index.js';
import { CATALOG_BY_TYPE } from '../../../moments/momentCatalog.js';
import { host, type RoomSocket } from '../../../realtime/socket.js';
import type { MomentDTO, RoomDetail } from '../../../api/types.js';

interface Props {
  moments: MomentDTO[];
  activeMomentId: string | null;
  participantCount: number;
  teams: RoomDetail['teams'];
  socket: RoomSocket;
}

export function RoteiroColumn({
  moments,
  activeMomentId,
  participantCount,
  teams,
  socket,
}: Props) {
  const [teamCount, setTeamCount] = useState(3);
  const activeIndex = moments.findIndex((m) => m.id === activeMomentId);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-brand-soft p-3 text-center">
        <span className="text-2xl font-bold text-brand">{participantCount}</span>
        <p className="text-sm text-muted">alunos online</p>
      </div>

      <div className="rounded-xl border border-line p-3">
        <p className="mb-2 text-sm font-medium text-ink">Formar equipes</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={2}
            max={6}
            value={teamCount}
            onChange={(e) => setTeamCount(Number(e.target.value))}
            className="w-16 rounded-lg border border-line bg-surface px-2 py-1"
            aria-label="Número de equipes"
          />
          <Button
            variant="secondary"
            onClick={() => host.assignTeams(socket, 'random', teamCount)}
          >
            Sortear
          </Button>
        </div>
        {teams.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {teams.map((t) => (
              <Badge key={t.id} color={t.color}>
                {t.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {moments.map((m, i) => {
          const entry = CATALOG_BY_TYPE[m.type];
          const isActive = m.id === activeMomentId;
          const isDone = activeIndex >= 0 && i < activeIndex;
          return (
            <li
              key={m.id}
              className={`flex items-center gap-2 rounded-xl border p-3 ${
                isActive ? 'border-brand bg-brand-soft' : 'border-line'
              }`}
            >
              <span aria-hidden>{entry?.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{m.title}</p>
                <p className="text-xs text-muted">
                  {isActive ? 'Ativo' : isDone ? 'Concluído' : 'Pendente'}
                </p>
              </div>
              <Button
                variant={isActive ? 'primary' : 'secondary'}
                onClick={() => host.startMoment(socket, m.id)}
              >
                {isActive ? 'Reiniciar' : 'Iniciar'}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
