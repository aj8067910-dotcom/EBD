import type { WallItem } from '@koinonia/shared';

/** Projector view of the question wall: the question(s) marked for display. */
export function WallScreen({ wall }: { wall: WallItem[] }) {
  const displayed = wall.filter((q) => q.displayed);
  const shown = displayed.length > 0 ? displayed : wall.slice(0, 1);

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <h1 className="text-3xl font-semibold text-muted">Mural de dúvidas</h1>
      {shown.length === 0 ? (
        <p className="text-3xl text-muted">Envie suas dúvidas pelo celular.</p>
      ) : (
        shown.map((q) => (
          <div
            key={q.id}
            className="rounded-2xl border border-line bg-surface p-8 text-center"
          >
            <p className="text-4xl text-ink">{q.text}</p>
            <p className="mt-3 text-2xl text-muted">👍 {q.upvotes} “eu também”</p>
          </div>
        ))
      )}
    </div>
  );
}
