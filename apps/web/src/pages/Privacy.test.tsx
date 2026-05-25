import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Privacy from '@/pages/Privacy';

vi.mock('@/redesign/components/RedesignHeader', () => ({ default: () => null }));
vi.mock('@/components/FooterSection', () => ({ default: () => null }));

describe('Privacy page', () => {
  it('renders policy heading', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: /политика конфиденциальности/i }),
    ).toBeInTheDocument();
  });
});
