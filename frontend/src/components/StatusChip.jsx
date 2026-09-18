import Chip from '@mui/material/Chip';

const STATUS_COLORS = {
  pending_dept_assignment: 'default',
  pending_technician_assignment: 'warning',
  pending_technician_assessment: 'warning',
  pending_dept_poc_review: 'info',
  resolved_full: 'success',
  resolved_partial: 'success',
  closed: 'default',
};

export default function StatusChip({ status, label }) {
  return (
    <Chip
      size="small"
      color={STATUS_COLORS[status] || 'default'}
      label={label}
      variant="outlined"
    />
  );
}
