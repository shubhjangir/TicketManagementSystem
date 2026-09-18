import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateTicketModal from '../CreateTicketModal';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/offices/') {
        return Promise.resolve({
          data: [{ id: 1, name: 'Harness-1317', has_multiple_floors: false, floors: [] }],
        });
      }
      if (url === '/issues/') {
        return Promise.resolve({
          data: [{ id: 1, name: 'AC not cooling', is_quick_issue: true, default_department: 1 }],
        });
      }
      return Promise.resolve({ data: [] });
    }),
    post: vi.fn(() => Promise.resolve({ data: { id: 99 } })),
  },
}));

vi.mock('../../context/RoleContext', () => ({
  useRole: () => ({ currentUser: { id: 1, name: 'Chaitanya M', role: 'client' } }),
}));

describe('CreateTicketModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a validation error and does not submit when no issue is selected', async () => {
    const onCreated = vi.fn();
    render(<CreateTicketModal open onClose={() => {}} onCreated={onCreated} />);

    await waitFor(() => expect(screen.getByText('Quick Issues — tap to autofill')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText('Select at least one issue.')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('lets a quick-issue chip fill the issue field and allows submit', async () => {
    const onCreated = vi.fn();
    render(<CreateTicketModal open onClose={() => {}} onCreated={onCreated} />);

    await waitFor(() => expect(screen.getByText('AC not cooling')).toBeInTheDocument());
    fireEvent.click(screen.getByText('AC not cooling'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });
});
