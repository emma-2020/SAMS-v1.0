// Flow test: the fee ledger view (shared by Player and Parent — see
// FeesView.tsx). CLAUDE.md flags fee data as deliberately never cached
// because a stale balance shown as current is a real-money risk — this
// test locks down the balance/status math (paid vs partial vs outstanding)
// and that "Pay Now" only ever appears for a fee that still has a balance,
// even when a fully-paid fee still carries a leftover payment_url (proving
// the balance check gates the link, not just the url's presence).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { feesApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import PlayerFeesPage from '../../app/dashboard/player/fees/page';
import { makeSession, makeProfile } from '../../test/fixtures';

vi.mock('@sams/api', async () => {
  const { buildApiMock } = await import('../../test/apiMock');
  return buildApiMock();
});

vi.mock('next/navigation', async () => {
  const { buildNavigationMock } = await import('../../test/navigationMock');
  return buildNavigationMock();
});

vi.mock('@sams/store', async () => {
  const { buildStoreMock } = await import('../../test/storeMock');
  return buildStoreMock();
});

const FEES = [
  {
    id: 'f1', description: 'Term 1 Fees', amount_owed: 50000, amount_paid: 20000,
    payment_url: 'https://checkout.paystack.com/f1xyz', created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'f2', description: 'Kit Fee', amount_owed: 10000, amount_paid: 10000,
    payment_url: 'https://checkout.paystack.com/f2xyz', created_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'f3', description: 'Registration Fee', amount_owed: 15000, amount_paid: 0,
    payment_url: 'https://checkout.paystack.com/f3xyz', created_at: '2026-06-01T00:00:00Z',
  },
];

// Reads a hero stat card's value by its label (e.g. "Total Owed") — each
// card's label row and value row are sibling divs under one shared parent.
function statCardValue(label: string) {
  const grid = screen.getByText('Total Owed').parentElement!.parentElement!.parentElement!;
  const labelRow = within(grid).getByText(label);
  return labelRow.parentElement!.children[1]?.textContent;
}

describe('Fee ledger — balance display and Pay Now link', () => {
  afterEach(() => {
    useAuthStore.setState({
      session: null, user: null, isAuthenticated: false, isLoading: false, isInitialised: false, error: null,
    });
  });

  it('shows Pay Now only for fees with a balance, and sums totals correctly', async () => {
    useAuthStore.getState().login(makeSession(), makeProfile('Player', { first_name: 'Kofi' }));
    vi.mocked(feesApi.getFees).mockResolvedValue(FEES);

    render(<PlayerFeesPage />);
    await screen.findByText('Term 1 Fees');

    const term1Row = screen.getByText('Term 1 Fees').closest('.sfee-row') as HTMLElement;
    const kitRow   = screen.getByText('Kit Fee').closest('.sfee-row') as HTMLElement;
    const regRow   = screen.getByText('Registration Fee').closest('.sfee-row') as HTMLElement;

    // Partially paid — has a balance, shows Pay Now with the right link.
    expect(within(term1Row).getByText('Partially Paid')).toBeInTheDocument();
    expect(within(term1Row).getByText('GHS 300.00')).toBeInTheDocument();
    expect(within(term1Row).getByRole('link', { name: /pay now/i })).toHaveAttribute(
      'href', 'https://checkout.paystack.com/f1xyz'
    );

    // Fully paid — no balance, no Pay Now, even though payment_url is set.
    expect(within(kitRow).getByText('Paid')).toBeInTheDocument();
    expect(within(kitRow).queryByRole('link', { name: /pay now/i })).not.toBeInTheDocument();

    // Untouched — full balance owed, shows Pay Now.
    expect(within(regRow).getByText('Outstanding')).toBeInTheDocument();
    expect(within(regRow).getByRole('link', { name: /pay now/i })).toHaveAttribute(
      'href', 'https://checkout.paystack.com/f3xyz'
    );

    // Hero stats: owed 500+100+150, paid 200+100+0, outstanding = owed - paid.
    expect(statCardValue('Total Owed')).toBe('GHS 750.00');
    expect(statCardValue('Paid')).toBe('GHS 300.00');
    expect(statCardValue('Outstanding')).toBe('GHS 450.00');
  });

  it('the "Outstanding" filter hides fully paid fees', async () => {
    useAuthStore.getState().login(makeSession(), makeProfile('Player', { first_name: 'Kofi' }));
    vi.mocked(feesApi.getFees).mockResolvedValue(FEES);

    render(<PlayerFeesPage />);
    await screen.findByText('Term 1 Fees');

    fireEvent.click(screen.getByRole('button', { name: /^outstanding$/i }));

    expect(screen.getByText('Term 1 Fees')).toBeInTheDocument();
    expect(screen.getByText('Registration Fee')).toBeInTheDocument();
    expect(screen.queryByText('Kit Fee')).not.toBeInTheDocument();
  });
});
