import { PollAnswer } from './PollAnswer.js';
import { PeerInstructionAnswer } from './PeerInstructionAnswer.js';
import { OpenAnswer } from './OpenAnswer.js';
import { WordCloudAnswer } from './WordCloudAnswer.js';
import { QuizAnswer } from './QuizAnswer.js';
import { VerseHighlightAnswer } from './VerseHighlightAnswer.js';
import type { StudentMomentProps } from './types.js';

/** Render the correct student answer component for the active moment type. */
export function MomentRenderer(props: StudentMomentProps) {
  switch (props.moment.type) {
    case 'POLL':
      return <PollAnswer {...props} />;
    case 'PEER_INSTRUCTION':
      return <PeerInstructionAnswer {...props} />;
    case 'OPEN_QUESTION':
    case 'REFLECTION':
      return <OpenAnswer {...props} />;
    case 'WORD_CLOUD':
      return <WordCloudAnswer {...props} />;
    case 'QUIZ_TEAM':
      return <QuizAnswer {...props} />;
    case 'VERSE_HIGHLIGHT':
      return <VerseHighlightAnswer {...props} />;
    case 'TIMER':
      return (
        <section className="py-8 text-center">
          <h2 className="text-xl font-semibold text-ink">
            {(props.moment.config as { label?: string }).label || 'Cronômetro'}
          </h2>
          <p className="mt-1 text-muted">Acompanhe o tempo na tela.</p>
        </section>
      );
    case 'QUESTION_WALL':
      return (
        <section className="py-8 text-center">
          <h2 className="text-xl font-semibold text-ink">Mural de dúvidas</h2>
          <p className="mt-1 text-muted">
            Use o botão “Enviar dúvida” para participar.
          </p>
        </section>
      );
    default:
      return null;
  }
}
