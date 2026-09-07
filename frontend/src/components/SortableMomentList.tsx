import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CATALOG_BY_TYPE } from '../moments/momentCatalog.js';
import { Button } from '../ui/index.js';
import { reorderIds } from './reorder.js';
import type { MomentDTO } from '../api/types.js';

interface Props {
  moments: MomentDTO[];
  onReorder: (orderedIds: string[]) => void;
  onEdit: (moment: MomentDTO) => void;
  onDelete: (id: string) => void;
  onTogglePreClass: (moment: MomentDTO) => void;
}

export function SortableMomentList({
  moments,
  onReorder,
  onEdit,
  onDelete,
  onTogglePreClass,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(
      reorderIds(
        moments.map((m) => m.id),
        String(active.id),
        String(over.id),
      ),
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={moments.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {moments.map((m) => (
            <SortableItem
              key={m.id}
              moment={m}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePreClass={onTogglePreClass}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  moment,
  onEdit,
  onDelete,
  onTogglePreClass,
}: {
  moment: MomentDTO;
  onEdit: (m: MomentDTO) => void;
  onDelete: (id: string) => void;
  onTogglePreClass: (m: MomentDTO) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: moment.id,
  });
  const entry = CATALOG_BY_TYPE[moment.type];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
    >
      <button
        type="button"
        className="cursor-grab text-muted"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="text-2xl" aria-hidden>
        {entry?.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{moment.title}</p>
        <p className="text-sm text-muted">
          {entry?.name} · {moment.points} pts
          {moment.imageUrl ? ' · 🖼️ com imagem' : ''}
        </p>
      </div>
      <label className="flex items-center gap-1 text-xs text-muted">
        <input
          type="checkbox"
          checked={moment.isPreClass}
          onChange={() => onTogglePreClass(moment)}
        />
        pré-aula
      </label>
      <Button variant="ghost" onClick={() => onEdit(moment)}>
        Editar
      </Button>
      <Button variant="ghost" onClick={() => onDelete(moment.id)} aria-label="Excluir momento">
        🗑
      </Button>
    </li>
  );
}
