import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';
import client from '../api/client';
import { useRole } from '../context/RoleContext';
import StatusChip from '../components/StatusChip';
import ActionPanel from '../components/ActionPanel';
import ActivityFeed from '../components/ActivityFeed';

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(`/tickets/${id}/`);
      setTicket(res.data);
    } catch (e) {
      setError('Could not load this ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const postComment = async (text) => {
    setPosting(true);
    try {
      await client.post(`/tickets/${id}/comments/`, { text, actor_id: currentUser.id });
      fetchTicket();
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    );
  }

  if (error || !ticket) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
        <Alert severity="error">{error || 'Ticket not found.'}</Alert>
      </Box>
    );
  }

  const floorNames = ticket.floors?.map((f) => f.name).join(', ');

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Back to ticket list">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>{ticket.title}</Typography>
        <Chip size="small" label={`#${ticket.ticket_number}`} variant="outlined" />
        <StatusChip status={ticket.status} label={ticket.status_display} />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {ticket.office_name}{floorNames ? `; ${floorNames}` : ''}
        </Typography>
        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", mt: 1 }}>
          <Typography variant="body2">
            <b>Created by:</b> {ticket.created_by_name}
          </Typography>
          {ticket.current_department_name && (
            <Typography variant="body2">
              <b>Department:</b> {ticket.current_department_name}
            </Typography>
          )}
          {ticket.assigned_technician_name && (
            <Typography variant="body2">
              <b>Technician:</b> {ticket.assigned_technician_name}
            </Typography>
          )}
        </Stack>
      </Paper>

      <ActionPanel ticket={ticket} onUpdated={fetchTicket} />

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Issue Description</Typography>
        <Typography variant="body2" color={ticket.description ? 'text.primary' : 'text.secondary'}>
          {ticket.description || 'No description provided.'}
        </Typography>
      </Paper>

      <ActivityFeed events={ticket.events || []} onComment={postComment} posting={posting} />
    </Box>
  );
}
