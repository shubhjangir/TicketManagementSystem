import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusChip from '../StatusChip';

describe('StatusChip', () => {
  it('renders the given label text', () => {
    render(<StatusChip status="pending_technician_assignment" label="Pending Technician Assignment" />);
    expect(screen.getByText('Pending Technician Assignment')).toBeInTheDocument();
  });

  it('falls back to default color for an unknown status', () => {
    render(<StatusChip status="some_unknown_status" label="Mystery" />);
    expect(screen.getByText('Mystery')).toBeInTheDocument();
  });
});
