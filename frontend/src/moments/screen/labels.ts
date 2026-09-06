import type { ActiveMomentView } from '@koinonia/shared';

interface Option {
  id: string;
  text: string;
}

/** Map option id -> "A. text" using the active moment's config. */
export function optionLabels(moment: ActiveMomentView | null): Record<string, string> {
  const config = (moment?.config ?? {}) as { options?: Option[] };
  const map: Record<string, string> = {};
  (config.options ?? []).forEach((o, i) => {
    map[o.id] = `${String.fromCharCode(65 + i)}. ${o.text}`;
  });
  return map;
}
