import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#7a4a2d" },
    secondary: { main: "#b87333" },
    background: { default: "#f8f3ee" },
    text: { primary: "#3b2a22", secondary: "#6b4b3a" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: [
      '"Inter"',
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      "Arial",
      "sans-serif",
    ].join(","),
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 20,
          borderColor: "rgba(122, 74, 45, 0.35)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          borderColor: "rgba(122, 74, 45, 0.3)",
          color: "#4b2f1d",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderColor: "rgba(122, 74, 45, 0.18)",
        },
      },
    },
  },
});

export default theme;
