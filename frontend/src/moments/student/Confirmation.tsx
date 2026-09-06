import { Button } from '../../ui/index.js';

/** Shared "answer sent" confirmation with an optional "change" action. */
export function Confirmation({
  onChange,
  canChange,
}: {
  onChange?: () => void;
  canChange?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl bg-ok/10 px-4 py-3 text-ok"
      role="status"
      aria-live="polite"
    >
      <span className="font-semibold">Resposta enviada ✓</span>
      {canChange && onChange && (
        <Button variant="ghost" onClick={onChange}>
          Alterar
        </Button>
      )}
    </div>
  );
}
