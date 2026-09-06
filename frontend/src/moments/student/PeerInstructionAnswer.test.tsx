import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ActiveMomentView, MomentPhase } from '@koinonia/shared';
import { PeerInstructionAnswer } from './PeerInstructionAnswer.js';

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

function renderPhase(phase: MomentPhase, submit = vi.fn().mockResolvedValue({ ok: true })) {
  return render(
    <PeerInstructionAnswer
      moment={{ ...moment, phase }}
      phase={phase}
      teamColor={null}
      submit={submit}
    />,
  );
}

describe('PeerInstructionAnswer phases', () => {
  it('OPEN (VOTE_1): shows the question, "Vote" label, and can submit a vote', async () => {
    const submit = vi.fn().mockResolvedValue({ ok: true });
    renderPhase('OPEN', submit);
    expect(screen.getByText('O que é graça?')).toBeInTheDocument();
    expect(screen.getByText('Vote')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Imerecida'));
    await userEvent.click(screen.getByRole('button', { name: /votar/i }));
    expect(submit).toHaveBeenCalledWith({
      type: 'PEER_INSTRUCTION',
      optionIds: ['b'],
    });
  });

  it('DISCUSS: hides voting and shows the group discussion prompt', () => {
    renderPhase('DISCUSS');
    expect(screen.getByText(/convença seus colegas/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /votar/i })).not.toBeInTheDocument();
  });

  it('REOPEN (VOTE_2): shows the re-vote confirmation button', () => {
    renderPhase('REOPEN');
    expect(
      screen.getByRole('button', { name: /confirmar novo voto/i }),
    ).toBeInTheDocument();
  });

  it('REVEALED: points the student to the projector', () => {
    renderPhase('REVEALED');
    expect(screen.getByText(/veja o resultado na tela/i)).toBeInTheDocument();
  });
});
