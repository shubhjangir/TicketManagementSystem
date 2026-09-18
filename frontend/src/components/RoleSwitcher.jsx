import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRole } from '../context/RoleContext';

const ROLE_LABEL = {
  client: 'Client',
  department_poc: 'Department POC',
  technician: 'Technician',
};

export default function RoleSwitcher() {
  const { users, currentUser, switchUser } = useRole();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
        Viewing as
      </Typography>
      <FormControl size="small" sx={{ minWidth: 240 }}>
        <InputLabel id="role-switch-label" sx={{ color: 'rgba(255,255,255,0.85)' }}>
          User
        </InputLabel>
        <Select
          labelId="role-switch-label"
          label="User"
          value={currentUser?.id || ''}
          onChange={(e) => switchUser(e.target.value)}
          sx={{
            color: 'white',
            '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
            '.MuiSvgIcon-root': { color: 'white' },
          }}
        >
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.name} — {ROLE_LABEL[u.role]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
