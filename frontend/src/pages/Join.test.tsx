import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Join } from './Join.js';

function mockPublicRoom(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    text: async () => JSON.stringify(body),
  });
}

function renderJoin() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/join']}>
        <Join />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('Join validation', () => {
  it('keeps "Entrar" disabled until a valid code and nickname are provided', async () => {
    vi.stubGlobal(
      'fetch',
      mockPublicRoom({
        exists: true,
        status: 'WAITING',
        lessonTitle: 'Filho Pródigo',
        teamsEnabled: false,
      }),
    );
    renderJoin();

    const enter = screen.getByRole('button', { name: /entrar|verificando/i });
    expect(enter).toBeDisabled();

    // Lowercase input is auto-uppercased on the code field.
    await userEvent.type(screen.getByLabelText(/código da sala/i), 'k3m9pq');
    expect(screen.getByLabelText(/código da sala/i)).toHaveValue('K3M9PQ');

    await userEvent.type(screen.getByLabelText(/seu apelido/i), 'João');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /entrar/i })).toBeEnabled(),
    );
  });

  it('shows an error when the room does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      mockPublicRoom({
        exists: false,
        status: null,
        lessonTitle: null,
        teamsEnabled: false,
      }),
    );
    renderJoin();

    await userEvent.type(screen.getByLabelText(/código da sala/i), 'K3M9PQ');
    await waitFor(() =>
      expect(screen.getByText(/sala não encontrada/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /entrar/i })).toBeDisabled();
  });
});
