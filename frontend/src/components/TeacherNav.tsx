import { Link } from 'react-router-dom';
import { cn } from '../ui/index.js';

const ITEMS = [
  { key: 'dashboard', label: 'Painel', to: '/teacher' },
  { key: 'daily', label: 'Leitura Diária', to: '/teacher/daily-readings' },
  { key: 'profile', label: 'Perfil', to: '/profile' },
];

/** Simple top navigation for teacher pages. */
export function TeacherNav({ active }: { active?: string }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 border-b border-line pb-3">
      <span className="mr-3 text-sm font-bold uppercase tracking-widest text-brand">
        El Shaday
      </span>
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          to={item.to}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-semibold',
            active === item.key ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
