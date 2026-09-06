import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../ui/index.js';

/** Landing: choose to enter as a student (with a code) or as a teacher. */
export function Landing() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <div className="mb-2 text-5xl" aria-hidden>
          ✝️
        </div>
        <h1 className="text-3xl font-bold text-ink">Koinonia Class</h1>
        <p className="mt-1 text-muted">
          Participe da aula de EBD pelo seu celular.
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sou aluno</h2>
        <p className="text-sm text-muted">
          Entre com o código de 6 caracteres que o professor mostrou na tela.
        </p>
        <Button size="lg" block onClick={() => navigate('/join')}>
          Entrar com código
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sou professor</h2>
        <p className="text-sm text-muted">
          Monte o roteiro da aula e conduza os momentos em tempo real.
        </p>
        <Button
          size="lg"
          variant="secondary"
          block
          onClick={() => navigate('/teacher/login')}
        >
          Acessar painel
        </Button>
      </Card>
    </div>
  );
}
