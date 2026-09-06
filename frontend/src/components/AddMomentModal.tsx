import { useState } from 'react';
import type { MomentType } from '@koinonia/shared';
import { Modal } from './Modal.js';
import { MOMENT_CATALOG } from '../moments/momentCatalog.js';
import { MomentForm } from '../moments/teacher/MomentForm.js';
import type { MomentDraft } from '../templates/lessonTemplates.js';

interface AddMomentModalProps {
  onClose: () => void;
  onCreate: (draft: MomentDraft) => void;
}

/** Two-step modal: pick a moment type, then fill its form. */
export function AddMomentModal({ onClose, onCreate }: AddMomentModalProps) {
  const [type, setType] = useState<MomentType | null>(null);

  if (type) {
    return (
      <Modal title="Configurar momento" onClose={onClose} wide>
        <MomentForm
          type={type}
          onCancel={() => setType(null)}
          onSubmit={(draft) => {
            onCreate(draft);
            onClose();
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal title="Adicionar momento" onClose={onClose} wide>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MOMENT_CATALOG.map((entry) => (
          <button
            key={entry.type}
            type="button"
            onClick={() => setType(entry.type)}
            className="flex items-start gap-3 rounded-xl border border-line p-3 text-left hover:border-brand hover:bg-brand-soft"
          >
            <span className="text-2xl" aria-hidden>
              {entry.icon}
            </span>
            <span>
              <span className="block font-semibold text-ink">{entry.name}</span>
              <span className="block text-sm text-muted">{entry.whenToUse}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
