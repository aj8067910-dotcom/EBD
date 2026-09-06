import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OptionButton } from './OptionButton.js';

describe('OptionButton', () => {
  it('shows the letter for its index and the option text', () => {
    render(<OptionButton index={1} text="Favor imerecido" />);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Favor imerecido')).toBeInTheDocument();
  });

  it('reflects the selected state via aria-pressed', () => {
    render(<OptionButton index={0} text="A" selected />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onClick when tapped', async () => {
    const onClick = vi.fn();
    render(<OptionButton index={0} text="Opção" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<OptionButton index={0} text="Opção" disabled onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('marks a correct answer with a check', () => {
    render(<OptionButton index={0} text="Certa" state="correct" />);
    expect(screen.getByLabelText('correta')).toBeInTheDocument();
  });
});
