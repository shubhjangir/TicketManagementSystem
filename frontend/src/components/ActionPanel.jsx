import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Alert from '@mui/material/Alert';
import client from '../api/client';
import { useRole } from '../context/RoleContext';

export default function ActionPanel({ ticket, onUpdated }) {
  const { currentUser } = useRole();
  const [expanded, setExpanded] = useState(null); // 'assign' | 'department' | 'assessment' | null
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [assessmentResult, setAssessmentResult] = useState('full');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    client.get('/departments/').then((res) => setDepartments(res.data.results || res.data));
  }, []);

  useEffect(() => {
    if (expanded === 'assign' && ticket.current_department) {
      client.get('/users/', { params: { role: 'technician', department: ticket.current_department } })
        .then((res) => setTechnicians(res.data.results || res.data));
    }
  }, [expanded, ticket.current_department]);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setExpanded(null);
      onUpdated();
    } catch (e) {
      setError(e.response?.data?.detail || 'Action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const role = currentUser?.role;

  // Client: can mark resolved once the ticket is out of their hands, matching wireframe copy.
  if (role === 'client') {
    if (ticket.status === 'pending_dept_poc_review') {
      return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
          <Typography sx={{ mb: 1 }}>
            Ticket created successfully. If the issue is resolved, you can mark it as resolved.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => run(() =>
              client.post(`/tickets/${ticket.id}/mark_resolved/`, { level: 'full', actor_id: currentUser.id })
            )}
          >
            Mark Resolved
          </Button>
        </Box>
      );
    }
    return null;
  }

  // Department POC: assign a worker or change department, only while pending technician assignment.
  if (role === 'department_poc') {
    if (ticket.status !== 'pending_technician_assignment') return null;
    return (
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
        <Typography sx={{ mb: 1.5 }}>Review and proceed with the next step.</Typography>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={() => setExpanded(expanded === 'assign' ? null : 'assign')}>
            Assign Worker
          </Button>
          <Button variant="outlined" onClick={() => setExpanded(expanded === 'department' ? null : 'department')}>
            Change Department
          </Button>
        </Stack>

        {expanded === 'assign' && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="worker-label">Select worker</InputLabel>
              <Select
                labelId="worker-label"
                label="Select worker"
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
              >
                {technicians.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="success"
              disabled={!selectedWorker || busy}
              onClick={() => run(() =>
                client.post(`/tickets/${ticket.id}/assign_worker/`, {
                  worker_id: selectedWorker, actor_id: currentUser.id,
                })
              )}
            >
              Ok
            </Button>
          </Stack>
        )}

        {expanded === 'department' && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="dept-label">Select department</InputLabel>
              <Select
                labelId="dept-label"
                label="Select department"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="success"
              disabled={!selectedDept || busy}
              onClick={() => run(() =>
                client.post(`/tickets/${ticket.id}/change_department/`, {
                  department_id: selectedDept, actor_id: currentUser.id,
                })
              )}
            >
              Ok
            </Button>
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          On confirming a department change, this ticket will move to the new department and you
          will no longer see it here.
        </Typography>
      </Box>
    );
  }

  // Technician: submit assessment, only while pending technician assessment, and only if it's their ticket.
  if (role === 'technician') {
    if (ticket.status !== 'pending_technician_assessment') return null;
    if (ticket.assigned_technician !== currentUser.id) return null;

    return (
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
        <Typography sx={{ mb: 1.5 }}>You have been assigned this ticket. Take action.</Typography>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        {expanded !== 'assessment' ? (
          <Button variant="outlined" onClick={() => setExpanded('assessment')}>Submit Assessment</Button>
        ) : (
          <Stack spacing={1.5}>
            <RadioGroup value={assessmentResult} onChange={(e) => setAssessmentResult(e.target.value)}>
              <FormControlLabel value="full" control={<Radio />} label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>Mark Fully Resolved</Typography>
                  <Typography variant="caption" color="text.secondary">
                    The issue has been fully resolved. No further action is needed.
                  </Typography>
                </Box>
              } />
              <FormControlLabel value="partial" control={<Radio />} label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>Mark Partially Resolved</Typography>
                  <Typography variant="caption" color="text.secondary">
                    I've resolved my part of the issue, but it also involves another department/worker's scope.
                  </Typography>
                </Box>
              } />
              <FormControlLabel value="reassign" control={<Radio />} label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>Suggest Department/Worker Change</Typography>
                  <Typography variant="caption" color="text.secondary">
                    The issue is outside my scope. Please assign it to the correct department/worker.
                  </Typography>
                </Box>
              } />
            </RadioGroup>
            <Button
              variant="contained"
              color="success"
              sx={{ alignSelf: 'flex-start' }}
              disabled={busy}
              onClick={() => run(() =>
                client.post(`/tickets/${ticket.id}/submit_assessment/`, {
                  result: assessmentResult, actor_id: currentUser.id,
                })
              )}
            >
              Confirm
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  return null;
}
