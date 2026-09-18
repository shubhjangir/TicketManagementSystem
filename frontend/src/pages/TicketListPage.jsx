import { useEffect, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import Stack from "@mui/material/Stack";
import Pagination from "@mui/material/Pagination";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import client from "../api/client";
import { useRole } from "../context/RoleContext";
import TicketCard from "../components/TicketCard";
import CreateTicketModal from "../components/CreateTicketModal";

export default function TicketListPage() {
  const { currentUser } = useRole();
  const [tab, setTab] = useState("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await client.get("/tickets/", {
        params: {
          tab,
          search: search || undefined,
          page,
          role: currentUser.role,
          user_id: currentUser.id,
        },
      });
      setData(res.data);
    } catch (e) {
      setError("Could not load tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tab, search, page, currentUser]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, currentUser]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const pageCount = Math.max(1, Math.ceil(data.count / 10));

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2, flexWrap: "wrap" }}
        gap={1}
      >
        <Typography variant="h5" fontWeight={700}>
          {currentUser?.role === "client" && "My Tickets"}
          {currentUser?.role === "department_poc" && "Department Tickets"}
          {currentUser?.role === "technician" && "Assigned Tickets"}
        </Typography>
        {currentUser?.role === "client" && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create New Ticket
          </Button>
        )}
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Open Tickets" value="open" />
        <Tab label="Closed Tickets" value="closed" />
      </Tabs>

      <TextField
        fullWidth
        size="small"
        placeholder="Search by title, ticket number or description"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        aria-label="Search tickets"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={90} />
          ))}
        </Stack>
      )}

      {!loading && !error && data.results.length === 0 && (
        <Alert severity="info">No tickets here yet.</Alert>
      )}

      {!loading &&
        !error &&
        data.results.map((t) => <TicketCard key={t.id} ticket={t} />)}

      {!loading && data.count > 10 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Stack>
      )}

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          setTab("open");
          fetchTickets();
        }}
      />
    </Box>
  );
}
