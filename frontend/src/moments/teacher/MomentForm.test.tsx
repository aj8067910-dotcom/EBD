import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createMomentSchema } from '@koinonia/shared';
import { MomentForm } from './MomentForm.js';

describe('MomentForm (add moment)', () => {
  it('builds a valid POLL draft that passes the shared schema', async () => {
    const onSubmit = vi.fn();
    render(<MomentForm type="POLL" onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Pergunta'), 'Você concorda?');
    const optionInputs = screen.getAllByPlaceholderText(/opção/i);
    await userEvent.type(optionInputs[0]!, 'Sim');
    await userEvent.type(optionInputs[1]!, 'Não');

    await userEvent.click(screen.getByRole('button', { name: /salvar momento/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const draft = onSubmit.mock.calls[0]![0];
    expect(createMomentSchema.safeParse(draft).success).toBe(true);
    expect(draft.type).toBe('POLL');
  });

  it('shows a validation error for an incomplete moment', async () => {
    const onSubmit = vi.fn();
    render(<MomentForm type="POLL" onSubmit={onSubmit} onCancel={() => {}} />);
    // Submit with empty question / options.
    await userEvent.click(screen.getByRole('button', { name: /salvar momento/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/inválid|vazi|caracter|string/i)).toBeInTheDocument();
  });
});
