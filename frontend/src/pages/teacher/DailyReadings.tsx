import { useState } from 'react';
import { Badge, Button, Card, EmptyState, useToast } from '../../ui/index.js';
import { Modal as _Modal } from '../../components/Modal.js';
import {
  useCreateReading,
  useDailyReadings,
  useDeleteReading,
  usePublishReading,
  useRecipientsCount,
  useSendReading,
  useUpdateReading,
  readingArtPng,
  type DailyReading,
  type ReadingInput,
} from '../../api/part10Hooks.js';
import { TeacherNav } from '../../components/TeacherNav.js';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#6f665c',
  PUBLISHED: '#1f9d55',
  SENT: '#D91F1F',
};

const empty: ReadingInput = {
  title: '',
  verse: '',
  reference: '',
  message: '',
  readingDate: new Date().toISOString().slice(0, 10),
  scheduledAt: null,
};

export function DailyReadings() {
  const { toast } = useToast();
  const { data, isLoading } = useDailyReadings();
  const { data: recipients } = useRecipientsCount();
  const createReading = useCreateReading();
  const updateReading = useUpdateReading();
  const deleteReading = useDeleteReading();
  const publish = usePublishReading();
  const send = useSendReading();

  const [editing, setEditing] = useState<DailyReading | 'new' | null>(null);
  const [preview, setPreview] = useState<DailyReading | null>(null);

  const groups = data ?? { today: [], upcoming: [], past: [] };
  const all = [...groups.today, ...groups.upcoming, ...groups.past];

  const doSend = async (reading: DailyReading, audience: 'ALL' | 'TEACHERS' | 'STUDENTS') => {
    const count = recipients?.total ?? 0;
    if (!window.confirm(`A leitura será enviada para ${count} pessoa(s) pelo WhatsApp. Continuar?`)) {
      return;
    }
    const res = await send.mutateAsync({ id: reading.id, audience });
    toast(`Enviando para ${res.recipientCount} pessoa(s)…`, 'success');
    setPreview(null);
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <TeacherNav active="daily" />

      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold uppercase text-ink">Leitura Diária</h1>
          <p className="text-sm text-muted">
            {recipients?.total ?? 0} destinatário(s) ativos no WhatsApp
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>+ Nova leitura</Button>
      </header>

      {isLoading ? (
        <p className="text-muted">Carregando…</p>
      ) : all.length === 0 ? (
        <EmptyState
          icon="📖"
          title="Nenhuma leitura ainda"
          description="Crie a leitura de hoje e envie pelo WhatsApp."
          action={<Button onClick={() => setEditing('new')}>Criar leitura</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {(['today', 'upcoming', 'past'] as const).map((key) =>
            groups[key].length === 0 ? null : (
              <section key={key}>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                  {key === 'today' ? 'Hoje' : key === 'upcoming' ? 'Próximas' : 'Anteriores'}
                </h2>
                <ul className="flex flex-col gap-2">
                  {groups[key].map((r) => (
                    <Card key={r.id} className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{r.title}</p>
                        <p className="text-sm text-muted">
                          {r.reference} · {new Date(r.readingDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge color={STATUS_COLOR[r.status]}>{r.status}</Badge>
                      {(r.sentCount ?? 0) > 0 && (
                        <span className="text-xs text-muted">
                          {r.sentCount} enviada(s){(r.failedCount ?? 0) > 0 && ` · ${r.failedCount} falha(s)`}
                        </span>
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" onClick={() => setPreview(r)}>
                          Visualizar
                        </Button>
                        <Button variant="ghost" onClick={() => setEditing(r)}>
                          Editar
                        </Button>
                        {r.status === 'DRAFT' && (
                          <Button variant="ghost" onClick={() => publish.mutate(r.id)}>
                            Publicar
                          </Button>
                        )}
                        <Button onClick={() => setPreview(r)}>Enviar</Button>
                      </div>
                    </Card>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}

      {editing && (
        <ReadingEditor
          reading={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === 'new') await createReading.mutateAsync(input);
            else await updateReading.mutateAsync({ id: editing.id, input });
            setEditing(null);
            toast('Leitura salva', 'success');
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : async () => {
                  await deleteReading.mutateAsync(editing.id);
                  setEditing(null);
                }
          }
        />
      )}

      {preview && (
        <_Modal title="Prévia da arte" onClose={() => setPreview(null)}>
          <div className="flex flex-col gap-4">
            <img
              src={readingArtPng(preview.id)}
              alt={`Arte: ${preview.title}`}
              className="mx-auto w-full max-w-sm rounded-2xl border border-line"
            />
            <div className="flex flex-wrap gap-2">
              <a href={readingArtPng(preview.id)} download={`leitura-${preview.id}.png`}>
                <Button variant="secondary">Baixar arte</Button>
              </a>
              <Button onClick={() => doSend(preview, 'ALL')}>Enviar para todos</Button>
              <Button variant="secondary" onClick={() => doSend(preview, 'TEACHERS')}>
                Só professores
              </Button>
              <Button variant="secondary" onClick={() => doSend(preview, 'STUDENTS')}>
                Só alunos
              </Button>
            </div>
          </div>
        </_Modal>
      )}
    </div>
  );
}

function ReadingEditor({
  reading,
  onClose,
  onSave,
  onDelete,
}: {
  reading: DailyReading | null;
  onClose: () => void;
  onSave: (input: ReadingInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState<ReadingInput>(
    reading
      ? {
          title: reading.title,
          verse: reading.verse,
          reference: reading.reference,
          message: reading.message ?? '',
          readingDate: reading.readingDate.slice(0, 10),
          scheduledAt: reading.scheduledAt ? reading.scheduledAt.slice(0, 16) : null,
        }
      : empty,
  );
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ReadingInput, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (form.title.trim().length < 3) return setError('Título precisa de ao menos 3 caracteres');
    if (!form.verse.trim()) return setError('Versículo é obrigatório');
    if (!form.reference.trim()) return setError('Referência é obrigatória');
    setError(null);
    await onSave({
      ...form,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    });
  };

  return (
    <_Modal title={reading ? 'Editar leitura' : 'Nova leitura'} onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-ink">
          Título
          <input
            className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-surface px-3"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Versículo
          <textarea
            rows={3}
            className="mt-1 w-full rounded-xl border border-line bg-surface p-3"
            value={form.verse}
            onChange={(e) => set('verse', e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Referência
          <input
            className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-surface px-3"
            value={form.reference}
            onChange={(e) => set('reference', e.target.value)}
            placeholder="Ex.: Efésios 2:8"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Mensagem (opcional)
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl border border-line bg-surface p-3"
            value={form.message ?? ''}
            onChange={(e) => set('message', e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-ink">
            Data da leitura
            <input
              type="date"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-surface px-3"
              value={form.readingDate}
              onChange={(e) => set('readingDate', e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Agendar envio (opcional)
            <input
              type="datetime-local"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-surface px-3"
              value={form.scheduledAt ?? ''}
              onChange={(e) => set('scheduledAt', e.target.value)}
            />
          </label>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between">
          {onDelete ? (
            <Button variant="ghost" onClick={onDelete}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      </div>
    </_Modal>
  );
}
