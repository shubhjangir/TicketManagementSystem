import { Routes, Route } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import RoleSwitcher from "./components/RoleSwitcher";
import { useRole } from "./context/RoleContext";
import TicketListPage from "./pages/TicketListPage";
import TicketDetailPage from "./pages/TicketDetailPage";

export default function App() {
  const { loading } = useRole();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" component="header">
        <Toolbar sx={{ flexWrap: "wrap", gap: 1, py: 1 }}>
          <ConfirmationNumberIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Ticket Management System
          </Typography>
          <RoleSwitcher />
        </Toolbar>
      </AppBar>

      <Box component="main">
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Routes>
            <Route path="/" element={<TicketListPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
          </Routes>
        )}
      </Box>
    </Box>
  );
}
