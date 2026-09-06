import { useNavigate } from 'react-router-dom';
import { Button, Card, Halftone, Star, StarCluster } from '../ui/index.js';

/** Landing: choose to enter as a student (with a code) or as a teacher. */
export function Landing() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-full overflow-hidden">
      <Halftone from="top-right" opacity={0.18} />
      <Halftone from="bottom-left" color="var(--accent)" opacity={0.12} />

      <div className="relative mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
        <header className="text-center">
          <StarCluster className="mb-3 justify-center" />
          <h1 className="text-6xl font-extrabold uppercase tracking-tight text-brand">
            El Shaday
          </h1>
          <p className="mt-3">
            <span className="capsule bg-surface text-sm font-semibold uppercase tracking-wide text-brand-strong">
              <Star size={12} color="var(--accent)" /> Escola Bíblica Dominical
            </span>
          </p>
          <p className="mt-4 text-muted">
            Participe da aula pelo seu celular, em tempo real.
          </p>
        </header>

        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold uppercase text-ink">Sou aluno</h2>
          <p className="text-sm text-muted">
            Entre com o código de 6 caracteres que o professor mostrou na tela.
          </p>
          <Button size="lg" variant="accent" block onClick={() => navigate('/join')}>
            Entrar com código
          </Button>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold uppercase text-ink">Sou professor</h2>
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

        <p className="text-center text-xs uppercase tracking-widest text-muted">
          El Shaddai · o Deus que basta
        </p>
      </div>
    </div>
  );
}
