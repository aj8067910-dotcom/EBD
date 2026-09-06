import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActiveMomentView, PeerInstructionResults } from '@koinonia/shared';
import { PeerInstructionScreen } from './PeerInstructionScreen.js';

const moment: ActiveMomentView = {
  id: 'm1',
  type: 'PEER_INSTRUCTION',
  title: 'Peer',
  phase: 'OPEN',
  points: 0,
  config: {
    question: 'O que é graça?',
    options: [
      { id: 'a', text: 'Merecida' },
      { id: 'b', text: 'Imerecida' },
    ],
  },
};

const results: PeerInstructionResults = {
  type: 'PEER_INSTRUCTION',
  before: [
    { optionId: 'a', count: 3 },
    { optionId: 'b', count: 1 },
  ],
  after: [
    { optionId: 'a', count: 1 },
    { optionId: 'b', count: 3 },
  ],
  totalBefore: 4,
  totalAfter: 4,
  correctOptionIds: ['b'],
  accuracyBefore: 0.25,
  accuracyAfter: 0.75,
  gain: 0.5,
};

describe('PeerInstructionScreen', () => {
  it('during VOTE_1 shows only the response count, not the distribution', () => {
    render(
      <PeerInstructionScreen
        moment={moment}
        phase="OPEN"
        results={results}
        answeredCount={4}
        timer={null}
      />,
    );
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/já votaram/i)).toBeInTheDocument();
    // The option distribution must NOT be revealed before REVEALED.
    expect(screen.queryByText(/Imerecida/)).not.toBeInTheDocument();
  });

  it('at REVEALED shows both charts and the learning gain', () => {
    render(
      <PeerInstructionScreen
        moment={moment}
        phase="REVEALED"
        results={results}
        answeredCount={4}
        timer={null}
      />,
    );
    expect(screen.getByText(/Antes/)).toBeInTheDocument();
    expect(screen.getByText(/Depois/)).toBeInTheDocument();
    expect(screen.getByText(/Ganho: 50 pontos percentuais/)).toBeInTheDocument();
  });
});
