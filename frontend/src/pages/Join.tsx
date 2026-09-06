import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@koinonia/shared';
import { Button, Card, Input } from '../ui/index.js';
import { usePublicRoom } from '../api/hooks.js';
import { loadSession, saveSession } from '../lib/session.js';

/** Keep only allowed, uppercased code characters. */
function sanitizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .split('')
    .filter((c) => ROOM_CODE_ALPHABET.includes(c))
    .join('')
    .slice(0, ROOM_CODE_LENGTH);
}

export function Join() {
  const params = useParams();
  const navigate = useNavigate();
  const saved = loadSession();

  const [code, setCode] = useState(
    sanitizeCode(params.code ?? saved?.code ?? ''),
  );
  const [nickname, setNickname] = useState(saved?.nickname ?? '');

  const codeComplete = code.length === ROOM_CODE_LENGTH;
  const { data: room, isFetching } = usePublicRoom(codeComplete ? code : undefined);

  const codeError = useMemo(() => {
    if (!codeComplete || isFetching || !room) return undefined;
    if (!room.exists) return 'Sala não encontrada';
    if (room.status === 'ENDED') return 'Esta aula já foi encerrada';
    return undefined;
  }, [codeComplete, isFetching, room]);

  const nicknameValid = nickname.trim().length >= 2 && nickname.trim().length <= 20;
  const roomOk = !!room?.exists && room.status !== 'ENDED';
  const canEnter = codeComplete && roomOk && nicknameValid && !codeError;

  useEffect(() => {
    if (params.code) setCode(sanitizeCode(params.code));
  }, [params.code]);

  const handleEnter = () => {
    if (!canEnter) return;
    saveSession({ code, nickname: nickname.trim() });
    navigate(`/room/${code}`);
  };

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-ink">Entrar na aula</h1>
        <p className="mt-1 text-muted">Digite o código e escolha um apelido.</p>
      </header>

      <Card className="flex flex-col gap-4">
        <Input
          name="code"
          label="Código da sala"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Ex.: K3M9PQ"
          value={code}
          maxLength={ROOM_CODE_LENGTH}
          onChange={(e) => setCode(sanitizeCode(e.target.value))}
          className="text-center text-2xl font-bold tracking-[0.4em]"
          error={codeError}
          hint={
            !codeComplete
              ? `${code.length}/${ROOM_CODE_LENGTH} caracteres`
              : room?.lessonTitle
                ? `Aula: ${room.lessonTitle}`
                : undefined
          }
        />

        <Input
          name="nickname"
          label="Seu apelido"
          placeholder="Ex.: João"
          value={nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
          hint="Entre 2 e 20 caracteres"
        />

        <Button size="lg" block disabled={!canEnter} onClick={handleEnter}>
          {isFetching && codeComplete ? 'Verificando…' : 'Entrar'}
        </Button>
      </Card>
    </div>
  );
}
