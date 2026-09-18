import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import client from '../api/client';
import { useRole } from '../context/RoleContext';

export default function CreateTicketModal({ open, onClose, onCreated }) {
  const { currentUser } = useRole();
  const [offices, setOffices] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [office, setOffice] = useState(null);
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [selectedFloors, setSelectedFloors] = useState([]);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!open) return;
    client.get('/offices/').then((res) => {
      const list = res.data.results || res.data;
      setOffices(list);
      setOffice(list[0] || null);
    });
    client.get('/issues/').then((res) => setAllIssues(res.data.results || res.data));
  }, [open]);

  const reset = () => {
    setSelectedIssues([]);
    setSelectedFloors([]);
    setDescription('');
    setErrors({});
    setSubmitError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleQuickIssue = (issue) => {
    setSelectedIssues((prev) =>
      prev.some((i) => i.id === issue.id)
        ? prev.filter((i) => i.id !== issue.id)
        : [...prev, issue]
    );
  };

  const quickIssues = allIssues.filter((i) => i.is_quick_issue);

  const handleSubmit = async () => {
    const newErrors = {};
    if (selectedIssues.length === 0) newErrors.issues = 'Select at least one issue.';
    if (office?.has_multiple_floors && selectedFloors.length === 0) {
      newErrors.floors = 'Your office has multiple floors — please select where the issue is.';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await client.post('/tickets/', {
        office: office.id,
        issue_ids: selectedIssues.map((i) => i.id),
        floor_ids: selectedFloors.map((f) => f.id),
        description,
        created_by: currentUser.id,
      });
      reset();
      onCreated();
    } catch (e) {
      const data = e.response?.data;
      if (data && typeof data === 'object') {
        setErrors(data);
      } else {
        setSubmitError('Something went wrong creating the ticket. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" disableRestoreFocus>
      <DialogTitle>Create New Ticket</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={offices}
            getOptionLabel={(o) => o.name || ''}
            value={office}
            onChange={(_, v) => { setOffice(v); setSelectedFloors([]); }}
            renderInput={(params) => <TextField {...params} label="Office" />}
          />

          <div>
            <Typography variant="subtitle2" gutterBottom>Quick Issues — tap to autofill</Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap" }} gap={1}>
              {quickIssues.map((issue) => (
                <Chip
                  key={issue.id}
                  label={issue.name}
                  clickable
                  color={selectedIssues.some((i) => i.id === issue.id) ? 'primary' : 'default'}
                  onClick={() => toggleQuickIssue(issue)}
                />
              ))}
            </Stack>
          </div>

          <Autocomplete
            multiple
            options={allIssues}
            getOptionLabel={(o) => o.name || ''}
            value={selectedIssues}
            onChange={(_, v) => setSelectedIssues(v)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Issue(s)*"
                placeholder="Type or search issue"
                error={!!errors.issues || !!errors.issue_ids}
                helperText={errors.issues || errors.issue_ids}
              />
            )}
          />

          {office?.has_multiple_floors && (
            <Autocomplete
              multiple
              options={office.floors || []}
              getOptionLabel={(o) => o.name || ''}
              value={selectedFloors}
              onChange={(_, v) => setSelectedFloors(v)}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Floor(s)*"
                  placeholder="Select floor(s)"
                  error={!!errors.floors || !!errors.floor_ids}
                  helperText={
                    errors.floors || errors.floor_ids ||
                    'Your office has multiple floors — please select where the issue is.'
                  }
                />
              )}
            />
          )}

          <TextField
            label="Description"
            placeholder="Describe the issue (optional)"
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="error" onClick={handleClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
