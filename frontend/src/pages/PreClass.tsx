import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { MomentType } from '@koinonia/shared';
import { api } from '../api/client.js';
import { Button, Card, Input, OptionButton, useToast } from '../ui/index.js';

interface PreClassMoment {
  id: string;
  type: MomentType;
  title: string;
  config: Record<string, unknown>;
}
interface PreClassData {
  lessonId: string;
  lessonTitle: string;
  bibleReference: string;
  moments: PreClassMoment[];
}

export function PreClass() {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const lessonId = params.get('lesson') ?? '';
  const { toast } = useToast();

  const [data, setData] = useState<PreClassData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api
      .get<PreClassData>(`/lessons/${lessonId}/preclass?token=${token}`)
      .then(setData)
      .catch(() => setError('Link de pré-aula inválido ou expirado.'));
  }, [lessonId, token]);

  const canSend = useMemo(
    () => nickname.trim().length >= 2 && Object.keys(answers).length > 0,
    [nickname, answers],
  );

  const submit = async () => {
    try {
      for (const [momentId, payload] of Object.entries(answers)) {
        // eslint-disable-next-line no-await-in-loop
        await api.post(`/lessons/${lessonId}/preclass?token=${token}`, {
          nickname: nickname.trim(),
          momentId,
          payload,
        });
      }
      setSent(true);
    } catch {
      toast('Não foi possível enviar. Verifique suas respostas.', 'error');
    }
  };

  if (error) {
    return <div className="p-8 text-center text-danger">{error}</div>;
  }
  if (!data) {
    return <div className="p-8 text-center text-muted">Carregando…</div>;
  }
  if (sent) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-ink">Obrigado! 🙏</h1>
        <p className="mt-2 text-muted">Suas respostas de pré-aula foram enviadas.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">{data.lessonTitle}</h1>
        <p className="text-muted">{data.bibleReference} · Pré-aula</p>
      </header>

      <Card>
        <Input
          name="nickname"
          label="Seu nome/apelido"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
        />
      </Card>

      {data.moments.map((m) => (
        <Card key={m.id} className="flex flex-col gap-3">
          <MomentInput
            moment={m}
            onAnswer={(payload) => setAnswers((prev) => ({ ...prev, [m.id]: payload }))}
          />
        </Card>
      ))}

      <Button size="lg" block disabled={!canSend} onClick={submit}>
        Enviar respostas
      </Button>
    </div>
  );
}

function MomentInput({
  moment,
  onAnswer,
}: {
  moment: PreClassMoment;
  onAnswer: (payload: unknown) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');

  if (moment.type === 'POLL' || moment.type === 'PEER_INSTRUCTION') {
    const config = moment.config as { question: string; options: { id: string; text: string }[] };
    return (
      <>
        <p className="font-semibold text-ink">{config.question || moment.title}</p>
        <div className="flex flex-col gap-2">
          {config.options.map((opt, i) => (
            <OptionButton
              key={opt.id}
              index={i}
              text={opt.text}
              selected={selected === opt.id}
              onClick={() => {
                setSelected(opt.id);
                onAnswer({ type: moment.type, optionIds: [opt.id] });
              }}
            />
          ))}
        </div>
      </>
    );
  }

  const config = moment.config as { prompt?: string };
  const isWord = moment.type === 'WORD_CLOUD';
  return (
    <>
      <p className="font-semibold text-ink">{config.prompt || moment.title}</p>
      <Input
        name={moment.id}
        value={text}
        maxLength={isWord ? 40 : 280}
        onChange={(e) => {
          setText(e.target.value);
          const value = e.target.value.trim();
          if (!value) return;
          onAnswer(
            isWord
              ? { type: 'WORD_CLOUD', word: value.split(/\s+/)[0] }
              : { type: moment.type, text: value },
          );
        }}
        placeholder={isWord ? 'Uma palavra' : 'Sua resposta'}
      />
    </>
  );
}
