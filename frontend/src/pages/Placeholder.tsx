import { Link } from 'react-router-dom';
import { Button, EmptyState } from '../ui/index.js';

/** Simple placeholder for routes implemented in later parts. */
export function Placeholder({ title, part }: { title: string; part?: string }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md items-center p-6">
      <div className="w-full">
        <EmptyState
          icon="🚧"
          title={title}
          description={
            part ? `Esta tela será construída na ${part}.` : undefined
          }
          action={
            <Link to="/">
              <Button variant="secondary">Voltar ao início</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
