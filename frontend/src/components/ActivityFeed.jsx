import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function describeEvent(event) {
  switch (event.event_type) {
    case 'created':
      return <><b>{event.actor_name}</b> created the ticket.</>;
    case 'auto_assigned':
      return <><b>{event.actor_name}</b> auto-assigned the ticket. <em>{event.from_value} → {event.to_value}</em></>;
    case 'assigned_technician':
      return <><b>{event.actor_name}</b> assigned technician. <em>{event.from_value} → {event.to_value}</em></>;
    case 'department_changed':
      return <><b>{event.actor_name}</b> changed department. <em>{event.from_value} → {event.to_value}</em></>;
    case 'status_changed':
      if (event.from_value === 'assessment_result') return null; // internal marker, not shown
      return <><b>{event.actor_name}</b> changed status of the ticket. <em>{event.from_value} → {event.to_value}</em></>;
    case 'resolved':
      return <><b>{event.actor_name}</b> resolved the ticket. <em>{event.to_value}</em></>;
    case 'comment':
      return <><b>{event.actor_name}</b> commented: “{event.comment_text}”</>;
    default:
      return <>{event.actor_name} — {event.event_type}</>;
  }
}

export default function ActivityFeed({ events, onComment, posting }) {
  const [tab, setTab] = useState('all');
  const [comment, setComment] = useState('');

  const filtered = events.filter((e) => {
    if (tab === 'all') return describeEvent(e) !== null;
    if (tab === 'comments') return e.event_type === 'comment';
    return e.event_type !== 'comment' && describeEvent(e) !== null;
  });

  const submit = () => {
    if (!comment.trim()) return;
    onComment(comment.trim());
    setComment('');
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: "wrap" }}>
        <Typography variant="subtitle1" fontWeight={700}>Activity</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="all" label="All" />
          <Tab value="actions" label="Actions" />
          <Tab value="comments" label="Comments" />
        </Tabs>
      </Stack>

      <Stack spacing={2} sx={{ mt: 2 }}>
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary">No activity yet.</Typography>
        )}
        {filtered.map((event) => (
          <Stack direction="row" spacing={1.5} key={event.id}>
            <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>{initials(event.actor_name)}</Avatar>
            <Box>
              <Typography variant="body2">{describeEvent(event)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(event.created_at).toLocaleString()}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Write a comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <Button
          variant="contained"
          onClick={submit}
          disabled={posting || !comment.trim()}
          startIcon={posting ? <CircularProgress size={14} color="inherit" /> : null}
        >
          Post
        </Button>
      </Stack>
    </Box>
  );
}
