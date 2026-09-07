import { useState } from 'react';
import { createMomentSchema, type MomentType } from '@koinonia/shared';
import { Button, Input } from '../../ui/index.js';
import { CATALOG_BY_TYPE, oid } from '../momentCatalog.js';
import type { MomentDraft } from '../../templates/lessonTemplates.js';

interface Option {
  id: string;
  text: string;
}

interface MomentFormProps {
  type: MomentType;
  initial?: MomentDraft;
  onSubmit: (draft: MomentDraft) => void;
  onCancel: () => void;
}

/**
 * Per-type moment editor. Values are validated with the shared Zod schema
 * (`createMomentSchema`) on submit so client and server agree.
 */
export function MomentForm({ type, initial, onSubmit, onCancel }: MomentFormProps) {
  const entry = CATALOG_BY_TYPE[type];
  const [title, setTitle] = useState(initial?.title ?? entry.defaultTitle);
  const [points, setPoints] = useState(initial?.points ?? entry.defaultPoints);
  const [isPreClass, setIsPreClass] = useState(initial?.isPreClass ?? false);
  const [config, setConfig] = useState<Record<string, unknown>>(
    initial?.config ?? entry.defaultConfig(),
  );
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(
    initial?.correctOptionIds ?? [],
  );
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt ?? '');
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: unknown) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    const trimmedUrl = imageUrl.trim();
    const trimmedAlt = imageAlt.trim();
    const draft: MomentDraft = {
      type,
      title,
      points,
      isPreClass,
      config,
      ...(type === 'PEER_INSTRUCTION' ? { correctOptionIds } : {}),
      ...(trimmedUrl ? { imageUrl: trimmedUrl } : {}),
      ...(trimmedAlt ? { imageAlt: trimmedAlt } : {}),
    };
    const parsed = createMomentSchema.safeParse(draft);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue?.path.join('.') ?? ''} ${issue?.message ?? 'inválido'}`.trim());
      return;
    }
    onSubmit(draft);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {entry.icon} {entry.name} — {entry.whenToUse}
      </p>

      <Input name="title" label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />

      {renderTypeFields(type, config, set, correctOptionIds, setCorrectOptionIds)}

      <ImageField
        url={imageUrl}
        alt={imageAlt}
        onUrl={setImageUrl}
        onAlt={setImageAlt}
      />

      {type === 'QUIZ_TEAM' && (
        <Input
          name="points"
          type="number"
          label="Pontos base por questão"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
        />
      )}

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={isPreClass}
          onChange={(e) => setIsPreClass(e.target.checked)}
        />
        Momento de pré-aula (Just-in-Time Teaching)
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={submit}>Salvar momento</Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- type-specific */

function renderTypeFields(
  type: MomentType,
  config: Record<string, unknown>,
  set: (key: string, value: unknown) => void,
  correctOptionIds: string[],
  setCorrect: (ids: string[]) => void,
) {
  switch (type) {
    case 'POLL':
    case 'PEER_INSTRUCTION':
      return (
        <>
          <Input
            name="question"
            label="Pergunta"
            value={(config.question as string) ?? ''}
            onChange={(e) => set('question', e.target.value)}
          />
          <OptionsEditor
            options={(config.options as Option[]) ?? []}
            onChange={(opts) => set('options', opts)}
            correctId={type === 'PEER_INSTRUCTION' ? correctOptionIds[0] : undefined}
            onCorrect={type === 'PEER_INSTRUCTION' ? (id) => setCorrect([id]) : undefined}
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={!!config.allowMultiple}
              onChange={(e) => set('allowMultiple', e.target.checked)}
            />
            Permitir múltiplas escolhas
          </label>
          {type === 'PEER_INSTRUCTION' && (
            <Input
              name="discussSeconds"
              type="number"
              label="Segundos de discussão"
              value={(config.discussSeconds as number) ?? 150}
              onChange={(e) => set('discussSeconds', Number(e.target.value))}
            />
          )}
        </>
      );
    case 'OPEN_QUESTION':
    case 'REFLECTION':
      return (
        <>
          <Input
            name="prompt"
            label="Pergunta / comando"
            value={(config.prompt as string) ?? ''}
            onChange={(e) => set('prompt', e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={config.anonymous !== false}
              onChange={(e) => set('anonymous', e.target.checked)}
            />
            Respostas anônimas
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={config.requireApproval !== false}
              onChange={(e) => set('requireApproval', e.target.checked)}
            />
            Exigir aprovação antes de exibir
          </label>
        </>
      );
    case 'WORD_CLOUD':
      return (
        <Input
          name="prompt"
          label="Comando (ex.: Em uma palavra…)"
          value={(config.prompt as string) ?? ''}
          onChange={(e) => set('prompt', e.target.value)}
        />
      );
    case 'VERSE_HIGHLIGHT':
      return (
        <>
          <Input
            name="reference"
            label="Referência"
            value={(config.reference as string) ?? ''}
            onChange={(e) => set('reference', e.target.value)}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Texto (cole a tradução desejada)
            <textarea
              rows={5}
              className="rounded-xl border border-line bg-surface p-3 text-base text-ink"
              value={(config.text as string) ?? ''}
              onChange={(e) => set('text', e.target.value)}
            />
          </label>
        </>
      );
    case 'TIMER':
      return (
        <>
          <Input
            name="seconds"
            type="number"
            label="Segundos"
            value={(config.seconds as number) ?? 150}
            onChange={(e) => set('seconds', Number(e.target.value))}
          />
          <Input
            name="label"
            label="Rótulo"
            value={(config.label as string) ?? ''}
            onChange={(e) => set('label', e.target.value)}
          />
        </>
      );
    case 'QUESTION_WALL':
      return (
        <Input
          name="prompt"
          label="Convite do mural"
          value={(config.prompt as string) ?? ''}
          onChange={(e) => set('prompt', e.target.value)}
        />
      );
    case 'QUIZ_TEAM':
      return (
        <QuizEditor
          questions={(config.questions as QuizQuestion[]) ?? []}
          onChange={(qs) => set('questions', qs)}
        />
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------- image field */

/**
 * Optional illustrative image (comic strip / "tirinha", cartoon / "charge", or
 * any picture) that presents the "case" visually instead of only in text.
 * The teacher pastes an image URL; a live preview confirms it loads.
 */
function ImageField({
  url,
  alt,
  onUrl,
  onAlt,
}: {
  url: string;
  alt: string;
  onUrl: (v: string) => void;
  onAlt: (v: string) => void;
}) {
  const [broken, setBroken] = useState(false);
  const trimmed = url.trim();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3">
      <span className="text-sm font-medium text-ink">
        🖼️ Imagem do caso (opcional)
      </span>
      <p className="text-xs text-muted">
        Cole o link de uma imagem (tirinha, charge ou foto) para apresentar a
        situação visualmente. Hospede a imagem (ex.: Google Fotos, Imgur) e cole
        aqui o endereço que termina em .jpg, .png ou .webp.
      </p>
      <Input
        name="imageUrl"
        label="URL da imagem"
        type="url"
        placeholder="https://…/tirinha.png"
        value={url}
        onChange={(e) => {
          setBroken(false);
          onUrl(e.target.value);
        }}
      />
      <Input
        name="imageAlt"
        label="Legenda / descrição (acessibilidade)"
        placeholder="Ex.: Tirinha em que dois amigos discutem sobre perdão"
        value={alt}
        onChange={(e) => onAlt(e.target.value)}
      />
      {trimmed && !broken && (
        <img
          src={trimmed}
          alt={alt || 'Pré-visualização da imagem do caso'}
          className="mt-1 max-h-64 w-full rounded-lg border border-line object-contain"
          onError={() => setBroken(true)}
        />
      )}
      {trimmed && broken && (
        <p className="text-sm text-danger">
          Não foi possível carregar a imagem. Verifique se o link é público e
          aponta direto para o arquivo da imagem.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- sub-editors */

function OptionsEditor({
  options,
  onChange,
  correctId,
  onCorrect,
}: {
  options: Option[];
  onChange: (opts: Option[]) => void;
  correctId?: string;
  onCorrect?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">Opções</span>
      {options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          {onCorrect && (
            <input
              type="radio"
              name="correct"
              checked={correctId === opt.id}
              onChange={() => onCorrect(opt.id)}
              aria-label={`Marcar opção ${i + 1} como correta`}
            />
          )}
          <input
            className="min-h-[44px] flex-1 rounded-lg border border-line bg-surface px-3 text-ink"
            value={opt.text}
            placeholder={`Opção ${i + 1}`}
            onChange={(e) =>
              onChange(options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)))
            }
          />
          <Button
            variant="ghost"
            onClick={() => onChange(options.filter((o) => o.id !== opt.id))}
            aria-label="Remover opção"
          >
            ✕
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() => onChange([...options, { id: oid(), text: '' }])}
      >
        + Adicionar opção
      </Button>
    </div>
  );
}

interface QuizQuestion {
  id: string;
  text: string;
  options: Option[];
  correctId: string;
  seconds: number;
}

function QuizEditor({
  questions,
  onChange,
}: {
  questions: QuizQuestion[];
  onChange: (qs: QuizQuestion[]) => void;
}) {
  const update = (id: string, patch: Partial<QuizQuestion>) =>
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-ink">Questões ({questions.length})</span>
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">Questão {i + 1}</span>
            <Button variant="ghost" onClick={() => onChange(questions.filter((x) => x.id !== q.id))}>
              ✕
            </Button>
          </div>
          <input
            className="mb-2 min-h-[40px] w-full rounded-lg border border-line bg-surface px-3 text-ink"
            value={q.text}
            placeholder="Enunciado"
            onChange={(e) => update(q.id, { text: e.target.value })}
          />
          <OptionsEditor
            options={q.options}
            onChange={(opts) => update(q.id, { options: opts })}
            correctId={q.correctId}
            onCorrect={(id) => update(q.id, { correctId: id })}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-ink">
            Tempo (s):
            <input
              type="number"
              className="w-20 rounded-lg border border-line bg-surface px-2 py-1"
              value={q.seconds}
              onChange={(e) => update(q.id, { seconds: Number(e.target.value) })}
            />
          </label>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onChange([
            ...questions,
            {
              id: oid('q'),
              text: `Pergunta ${questions.length + 1}`,
              options: [
                { id: oid(), text: '' },
                { id: oid(), text: '' },
              ],
              correctId: '',
              seconds: 20,
            },
          ])
        }
      >
        + Adicionar questão
      </Button>
    </div>
  );
}
