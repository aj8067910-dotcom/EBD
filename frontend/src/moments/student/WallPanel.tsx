import { useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore.js';
import { postWall, upvoteWall, type RoomSocket } from '../../realtime/socket.js';
import { Button } from '../../ui/index.js';
import { useToast } from '../../ui/index.js';

/**
 * Always-available anonymous question wall: floating button opens a sheet to
 * post a doubt and "me too" (upvote) existing ones (dialogic learning).
 */
export function WallPanel({ socket }: { socket: RoomSocket }) {
  const wall = useRoomStore((s) => s.wall);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await postWall(socket, trimmed);
    setText('');
    toast('Dúvida enviada anonimamente', 'success');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex min-h-[56px] items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white shadow-lift"
        aria-label="Enviar dúvida anônima"
      >
        💬 Enviar dúvida
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Mural de dúvidas</h2>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>

            <textarea
              value={text}
              maxLength={280}
              rows={3}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva sua dúvida (anônima)…"
              className="mb-2 w-full rounded-xl border border-line bg-surface p-3 text-ink placeholder:text-muted"
              aria-label="Nova dúvida"
            />
            <Button block disabled={!text.trim()} onClick={send}>
              Enviar
            </Button>

            <ul className="mt-4 flex flex-col gap-2">
              {wall.map((q) => (
                <li
                  key={q.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
                >
                  <span className="flex-1 text-ink">{q.text}</span>
                  <button
                    type="button"
                    onClick={() => upvoteWall(socket, q.id)}
                    className="flex min-h-[40px] items-center gap-1 rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand"
                    aria-label={`Eu também (${q.upvotes})`}
                  >
                    👍 {q.upvotes}
                  </button>
                </li>
              ))}
              {wall.length === 0 && (
                <li className="py-4 text-center text-muted">
                  Nenhuma dúvida ainda. Seja o primeiro!
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
