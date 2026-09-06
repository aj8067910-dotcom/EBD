import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';
import { ToastProvider } from './ui/index.js';

function renderAt(path: string) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App routing', () => {
  it('renders the landing page at /', () => {
    renderAt('/');
    expect(
      screen.getByRole('heading', { name: /koinonia class/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /entrar com código/i }),
    ).toBeInTheDocument();
  });
});
