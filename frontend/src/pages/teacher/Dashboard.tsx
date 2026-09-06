import { useNavigate } from 'react-router-dom';
import {
  useCreateLesson,
  useCreateRoom,
  useDuplicateLesson,
  useLessons,
} from '../../api/teacherHooks.js';
import { Button, Card, EmptyState, useToast } from '../../ui/index.js';

export function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useLessons();
  const createLesson = useCreateLesson();
  const duplicate = useDuplicateLesson();
  const createRoom = useCreateRoom();

  const lessons = data?.lessons ?? [];

  const newLesson = async () => {
    const lesson = await createLesson.mutateAsync({
      title: 'Nova lição',
      bibleReference: 'Referência',
    });
    navigate(`/teacher/lessons/${lesson.lesson.id}`);
  };

  const start = async (lessonId: string) => {
    try {
      const { room } = await createRoom.mutateAsync(lessonId);
      navigate(`/teacher/live/${room.code}`);
    } catch {
      toast('Não foi possível iniciar a aula', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Minhas lições</h1>
        <Button onClick={newLesson} disabled={createLesson.isPending}>
          + Nova lição
        </Button>
      </header>

      {isLoading ? (
        <p className="text-muted">Carregando…</p>
      ) : lessons.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Nenhuma lição ainda"
          description="Crie sua primeira lição para montar o roteiro da aula."
          action={<Button onClick={newLesson}>Criar lição</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {lessons.map((l) => (
            <Card key={l.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-ink">{l.title}</h2>
                <p className="text-sm text-muted">
                  {l.bibleReference} · {l.momentCount} momento(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/teacher/lessons/${l.id}`)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => duplicate.mutate(l.id)}
                  disabled={duplicate.isPending}
                >
                  Duplicar
                </Button>
                <Button onClick={() => start(l.id)} disabled={createRoom.isPending}>
                  Iniciar aula
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
