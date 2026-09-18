import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import { useNavigate } from "react-router-dom";
import StatusChip from "./StatusChip";

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();
  const floorNames = ticket.floors?.map((f) => f.name).join(", ");

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1.5,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1,
      }}
      component="article"
      aria-label={`Ticket ${ticket.ticket_number}: ${ticket.title}`}
    >
      <Box sx={{ minWidth: 220, flex: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexWrap: "wrap" }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {ticket.title}
          </Typography>
          <Chip
            size="small"
            label={`#${ticket.ticket_number}`}
            variant="outlined"
          />
          <StatusChip status={ticket.status} label={ticket.status_display} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {ticket.office_name}
          {floorNames ? `; ${floorNames}` : ""}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Created by {ticket.created_by_name}
          {ticket.assigned_technician_name
            ? ` · Assignee: ${ticket.assigned_technician_name}`
            : ""}
        </Typography>
      </Box>
      <Button
        variant="contained"
        color="success"
        onClick={() => navigate(`/tickets/${ticket.id}`)}
      >
        View
      </Button>
    </Paper>
  );
}
