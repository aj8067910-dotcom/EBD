import type { ActiveMomentView } from '@koinonia/shared';
import { cn } from '../ui/cn.js';

interface MomentImageProps {
  moment: Pick<ActiveMomentView, 'imageUrl' | 'imageAlt'>;
  /** 'screen' = projector (large), 'student' = phone (compact). */
  variant?: 'screen' | 'student';
  className?: string;
}

/**
 * Optional illustrative image shown with a moment (a comic strip / "tirinha",
 * cartoon / "charge", or any picture) so a "case" can be presented visually
 * instead of only in text. Renders nothing when the moment has no image.
 */
export function MomentImage({ moment, variant = 'student', className }: MomentImageProps) {
  const url = moment.imageUrl?.trim();
  if (!url) return null;

  return (
    <figure className={cn('flex w-full flex-col items-center', className)}>
      <img
        src={url}
        alt={moment.imageAlt?.trim() || 'Imagem ilustrativa do caso'}
        className={cn(
          'rounded-2xl border border-line object-contain shadow-sm',
          variant === 'screen' ? 'max-h-[46vh] w-auto max-w-full' : 'max-h-72 w-auto max-w-full',
        )}
      />
      {moment.imageAlt?.trim() && (
        <figcaption
          className={cn(
            'mt-2 text-center text-muted',
            variant === 'screen' ? 'text-xl' : 'text-sm',
          )}
        >
          {moment.imageAlt}
        </figcaption>
      )}
    </figure>
  );
}
