import type {
  ActiveMomentView,
  MomentPhase,
  SubmitAnswerDTO,
} from '@koinonia/shared';

export interface SubmitResult {
  ok: boolean;
  isCorrect?: boolean | null;
}

export type SubmitFn = (answer: SubmitAnswerDTO) => Promise<SubmitResult>;

export interface StudentMomentProps {
  moment: ActiveMomentView;
  phase: MomentPhase | null;
  teamColor: string | null;
  submit: SubmitFn;
}

export interface OptionConfig {
  id: string;
  text: string;
}
