import type {
  ActiveMomentView,
  MomentPhase,
  MomentResults,
  TimerTick,
  WallItem,
} from '@koinonia/shared';
import { PollScreen } from './PollScreen.js';
import { PeerInstructionScreen } from './PeerInstructionScreen.js';
import { WordCloudScreen } from './WordCloudScreen.js';
import { OpenQuestionScreen } from './OpenQuestionScreen.js';
import { QuizScreen } from './QuizScreen.js';
import { VerseHighlightScreen } from './VerseHighlightScreen.js';
import { WallScreen } from './WallScreen.js';
import { TimerScreen } from './TimerScreen.js';

interface Props {
  moment: ActiveMomentView;
  phase: MomentPhase | null;
  results: MomentResults | null;
  answeredCount: number;
  timer: TimerTick | null;
  wall: WallItem[];
}

/** Match results to the active moment type (null when it belongs to another). */
function typed<T extends MomentResults['type']>(
  results: MomentResults | null,
  type: T,
): Extract<MomentResults, { type: T }> | null {
  return results && results.type === type
    ? (results as Extract<MomentResults, { type: T }>)
    : null;
}

export function ScreenRenderer({
  moment,
  phase,
  results,
  answeredCount,
  timer,
  wall,
}: Props) {
  switch (moment.type) {
    case 'POLL':
      return <PollScreen moment={moment} results={typed(results, 'POLL')} />;
    case 'PEER_INSTRUCTION':
      return (
        <PeerInstructionScreen
          moment={moment}
          phase={phase}
          results={typed(results, 'PEER_INSTRUCTION')}
          answeredCount={answeredCount}
          timer={timer}
        />
      );
    case 'WORD_CLOUD':
      return <WordCloudScreen moment={moment} results={typed(results, 'WORD_CLOUD')} />;
    case 'OPEN_QUESTION':
      return (
        <OpenQuestionScreen moment={moment} results={typed(results, 'OPEN_QUESTION')} />
      );
    case 'REFLECTION':
      return (
        <OpenQuestionScreen moment={moment} results={typed(results, 'REFLECTION')} />
      );
    case 'QUIZ_TEAM':
      return (
        <QuizScreen
          moment={moment}
          phase={phase}
          results={typed(results, 'QUIZ_TEAM')}
          answeredCount={answeredCount}
          timer={timer}
        />
      );
    case 'VERSE_HIGHLIGHT':
      return (
        <VerseHighlightScreen moment={moment} results={typed(results, 'VERSE_HIGHLIGHT')} />
      );
    case 'QUESTION_WALL':
      return <WallScreen wall={wall} />;
    case 'TIMER':
      return <TimerScreen moment={moment} timer={timer} />;
    default:
      return null;
  }
}
