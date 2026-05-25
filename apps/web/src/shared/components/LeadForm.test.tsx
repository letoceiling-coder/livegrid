import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LeadForm from '@/shared/components/LeadForm';

vi.mock('@/lib/api', () => ({
  apiPost: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

vi.mock('@/shared/components/ResponsivenessHint', () => ({
  default: () => null,
}));

function renderLeadForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LeadForm embedded title="" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LeadForm privacy consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks submit until consent is accepted', () => {
    renderLeadForm();
    const submit = screen.getByRole('button', { name: /отправить заявку/i });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).not.toBeDisabled();
  });

  it('shows consent error when submit attempted without checkbox', async () => {
    renderLeadForm();
    fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Иван' } });
    fireEvent.change(screen.getByPlaceholderText('Телефон'), {
      target: { value: '+7 (900) 123-45-67' },
    });

    const form = screen.getByRole('button', { name: /отправить заявку/i }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/политикой конфиденциальности/i);
    });
  });
});
