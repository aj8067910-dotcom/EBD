import type { WallItem } from '@koinonia/shared';
import { Button } from '../../../ui/index.js';
import { host, type RoomSocket } from '../../../realtime/socket.js';

export function WallColumn({
  wall,
  socket,
}: {
  wall: WallItem[];
  socket: RoomSocket;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">Mural de dúvidas</h3>
      {wall.length === 0 && <p className="text-sm text-muted">Nenhuma dúvida ainda.</p>}
      {wall.map((q) => (
        <div
          key={q.id}
          className={`rounded-xl border p-3 ${
            q.answered ? 'border-line opacity-60' : 'border-line'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-ink">{q.text}</p>
            <span className="shrink-0 text-xs text-muted">👍 {q.upvotes}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => host.markWall(socket, q.id, { answered: !q.answered })}
            >
              {q.answered ? 'Reabrir' : 'Respondida'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => host.markWall(socket, q.id, { displayed: !q.displayed })}
            >
              {q.displayed ? 'Ocultar' : 'Exibir no projetor'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
