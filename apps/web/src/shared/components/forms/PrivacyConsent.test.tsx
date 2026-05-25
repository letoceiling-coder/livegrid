import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyConsent from '@/shared/components/forms/PrivacyConsent';

import type { PrivacyConsentProps } from '@/shared/components/forms/PrivacyConsent';

function renderConsent(props: Partial<PrivacyConsentProps> = {}) {
  const onCheckedChange = vi.fn();
  render(
    <MemoryRouter>
      <PrivacyConsent
        checked={false}
        onCheckedChange={onCheckedChange}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onCheckedChange };
}

describe('PrivacyConsent', () => {
  it('renders privacy policy link', () => {
    renderConsent();
    const link = screen.getByRole('link', { name: /политикой конфиденциальности/i });
    expect(link).toHaveAttribute('href', '/privacy');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows validation error when provided', () => {
    renderConsent({ error: 'Подтвердите согласие' });
    expect(screen.getByRole('alert')).toHaveTextContent('Подтвердите согласие');
  });

  it('calls onCheckedChange when checkbox toggled', () => {
    const { onCheckedChange } = renderConsent();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
