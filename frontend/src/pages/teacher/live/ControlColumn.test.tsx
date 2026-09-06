import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ActiveMomentView } from '@koinonia/shared';

// Mock the socket module so host commands are spies (no real connection).
vi.mock('../../../realtime/socket.js', () => ({
  host: {
    advancePhase: vi.fn(),
    closeMoment: vi.fn(),
    approveAnswer: vi.fn(),
  },
}));

import { ControlColumn } from './ControlColumn.js';
import { host } from '../../../realtime/socket.js';

const peerMoment: ActiveMomentView = {
  id: 'm1',
  type: 'PEER_INSTRUCTION',
  title: 'Conceito',
  phase: 'OPEN',
  points: 0,
  config: { question: 'Q?', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeSocket = {} as any;

describe('ControlColumn (panel phase advance)', () => {
  it('advances the phase when the contextual button is clicked', async () => {
    render(
      <ControlColumn
        activeMoment={peerMoment}
        phase="OPEN"
        answeredCount={3}
        participantCount={5}
        results={null}
        socket={fakeSocket}
      />,
    );

    expect(screen.getByText('3/5 responderam')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /iniciar discussão/i }));
    expect(host.advancePhase).toHaveBeenCalledWith(fakeSocket, 'm1');
  });

  it('shows the REEXPLAIN alert when the backend suggests it', () => {
    render(
      <ControlColumn
        activeMoment={peerMoment}
        phase="REVEALED"
        answeredCount={5}
        participantCount={5}
        results={{
          type: 'PEER_INSTRUCTION',
          before: [],
          after: [],
          totalBefore: 5,
          totalAfter: 5,
          correctOptionIds: ['b'],
          accuracyBefore: 0.2,
          accuracyAfter: 0.8,
          gain: 0.6,
          suggestion: 'REEXPLAIN',
        }}
        socket={fakeSocket}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/reexplicar/i);
  });
});
