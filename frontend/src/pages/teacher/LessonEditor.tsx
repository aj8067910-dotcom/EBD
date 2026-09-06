import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, useToast } from '../../ui/index.js';
import {
  useCreateMoment,
  useCreateRoom,
  useDeleteMoment,
  useLesson,
  useReorderMoments,
  useUpdateLesson,
  useUpdateMoment,
} from '../../api/teacherHooks.js';
import { SortableMomentList } from '../../components/SortableMomentList.js';
import { AddMomentModal } from '../../components/AddMomentModal.js';
import { PreClassLink } from '../../components/PreClassLink.js';
import { Modal } from '../../components/Modal.js';
import { MomentForm } from '../../moments/teacher/MomentForm.js';
import { LESSON_TEMPLATES, type MomentDraft } from '../../templates/lessonTemplates.js';
import type { MomentDTO } from '../../api/types.js';

export function LessonEditor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useLesson(id);
  const updateLesson = useUpdateLesson(id);
  const createMoment = useCreateMoment(id);
  const updateMoment = useUpdateMoment(id);
  const deleteMoment = useDeleteMoment(id);
  const reorder = useReorderMoments(id);
  const createRoom = useCreateRoom();

  const lesson = data?.lesson;
  const [title, setTitle] = useState('');
  const [bibleReference, setBibleReference] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MomentDTO | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setBibleReference(lesson.bibleReference);
      setNotes(lesson.notes ?? '');
    }
  }, [lesson]);

  if (isLoading || !lesson) {
    return <div className="p-6 text-muted">Carregando…</div>;
  }

  const saveHeader = (patch: Record<string, string>) => updateLesson.mutate(patch);

  const applyTemplate = async (drafts: MomentDraft[]) => {
    for (const draft of drafts) {
      // eslint-disable-next-line no-await-in-loop
      await createMoment.mutateAsync(draft);
    }
    setShowTemplates(false);
    toast('Modelo aplicado', 'success');
  };

  const start = async () => {
    const { room } = await createRoom.mutateAsync(id);
    navigate(`/teacher/live/${room.code}`);
  };

  const momentToDraft = (m: MomentDTO): MomentDraft => ({
    type: m.type,
    title: m.title,
    points: m.points,
    isPreClass: m.isPreClass,
    config: m.config,
    correctOptionIds: m.correctOptionIds ?? undefined,
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/teacher')}>
          ← Voltar
        </Button>
        <Button onClick={start} disabled={createRoom.isPending}>
          Iniciar aula
        </Button>
      </div>

      <Card className="mb-5 flex flex-col gap-3">
        <Input
          name="title"
          label="Título da lição"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveHeader({ title })}
        />
        <Input
          name="bibleReference"
          label="Referência bíblica"
          value={bibleReference}
          onChange={(e) => setBibleReference(e.target.value)}
          onBlur={() => saveHeader({ bibleReference })}
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Notas do professor
          <textarea
            rows={3}
            className="rounded-xl border border-line bg-surface p-3 text-base text-ink"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => saveHeader({ notes })}
          />
        </label>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Roteiro</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowTemplates(true)}>
            Começar de um modelo
          </Button>
          <Button onClick={() => setAdding(true)}>+ Adicionar momento</Button>
        </div>
      </div>

      {lesson.moments.length === 0 ? (
        <p className="mb-5 rounded-xl border border-dashed border-line p-6 text-center text-muted">
          Nenhum momento ainda. Adicione um ou comece de um modelo.
        </p>
      ) : (
        <div className="mb-5">
          <SortableMomentList
            moments={lesson.moments}
            onReorder={(ids) => reorder.mutate(ids)}
            onEdit={(m) => setEditing(m)}
            onDelete={(mid) => deleteMoment.mutate(mid)}
            onTogglePreClass={(m) =>
              updateMoment.mutate({
                id: m.id,
                draft: { ...momentToDraft(m), isPreClass: !m.isPreClass },
              })
            }
          />
        </div>
      )}

      <PreClassLink lessonId={lesson.id} token={lesson.preClassToken} />

      {adding && (
        <AddMomentModal
          onClose={() => setAdding(false)}
          onCreate={(draft) => createMoment.mutate(draft)}
        />
      )}

      {editing && (
        <Modal title="Editar momento" onClose={() => setEditing(null)} wide>
          <MomentForm
            type={editing.type}
            initial={momentToDraft(editing)}
            onCancel={() => setEditing(null)}
            onSubmit={(draft) => {
              updateMoment.mutate({ id: editing.id, draft });
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {showTemplates && (
        <Modal title="Modelos de aula" onClose={() => setShowTemplates(false)}>
          <ul className="flex flex-col gap-2">
            {LESSON_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => applyTemplate(t.build())}
                  className="w-full rounded-xl border border-line p-3 text-left hover:border-brand hover:bg-brand-soft"
                >
                  <span className="block font-semibold text-ink">{t.name}</span>
                  <span className="block text-sm text-muted">{t.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}
