import React, { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import ProductDashboard from "./pages/ProductDashboard";
import Login from "./pages/Login";
import VerificationRules from "./pages/VerificationRules";
import EmployeeApprovals from "./pages/EmployeeApprovals";
import MerchantForms from "./pages/MerchantForms";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";

import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LogoutIcon from "@mui/icons-material/Logout";

import { BRAND } from "./theme";
import "./App.css";

function App() {
  const [mode, setMode] = useState("light");
  const [page, setPage] = useState("overview");
  const [pendingCount, setPendingCount] = useState(0);

  const EMP_BASE = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

  // Poll for pending employees every 30 seconds
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const [empRes, posRes] = await Promise.all([
          fetch(`${EMP_BASE}/auth/pending`),
          fetch(`${EMP_BASE}/auth/position-requests`)
        ]);
        const empData = await empRes.json();
        const posData = await posRes.json();
        const empCount = Array.isArray(empData) ? empData.length : 0;
        const posCount = Array.isArray(posData) ? posData.filter(r => r.status === 'pending').length : 0;
        setPendingCount(empCount + posCount);
      } catch { /* server might be off */ }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  // Check if already logged in from a previous session
  const savedAuth = localStorage.getItem("vv_auth");
  const [user, setUser] = useState(savedAuth ? JSON.parse(savedAuth) : null);

  const handleLogin  = (authObj) => setUser(authObj);
  const handleLogout = () => {
    localStorage.removeItem("vv_auth");
    setUser(null);
  };

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: BRAND.primary, light: BRAND.primaryMid, dark: "#0d3d24" },
      secondary: { main: BRAND.accent },
      background: {
        default: mode === "dark" ? "#111827" : "#f0f7f3",
        paper:   mode === "dark" ? "#1c2a3a" : "#ffffff",
      },
      text: {
        primary:   mode === "dark" ? "#f1f5f9" : "#1a2e22",
        secondary: mode === "dark" ? "#94a3b8" : "#4a7060",
      },
    },
    typography: {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      h6: { fontWeight: 700, letterSpacing: 0.4 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            transition: "box-shadow 0.25s, transform 0.2s",
            // off-white tint in dark mode for cards/KPIs
            ...(mode === "dark" && {
              background: "#1e2d3d",
              border: "1px solid rgba(255,255,255,0.07)",
            }),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            ...(mode === "dark" && { background: "#1e2d3d" }),
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: "0.82rem",
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            minWidth: 100,
            "&.Mui-selected": { color: "#ffffff" },
            transition: "color 0.2s",
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: BRAND.accent, height: 3, borderRadius: 2 },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* ── Show Login if not authenticated ─────────────────────── */}
      {!user && <Login onLogin={handleLogin} />}

      {/* ── Show Dashboard if authenticated ─────────────────────── */}
      {user && (<>

      {/* ── NAVBAR ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          background: "linear-gradient(90deg, #071a0f 0%, #0f3320 40%, #1a5c38 100%)",
          borderBottom: `2.5px solid ${BRAND.accent}`,
          px: { xs: 2, md: 4 },
          py: 0,
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 20px rgba(0,0,0,0.55)",
        }}
      >
        {/* LEFT — Logo image + FSE label */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
          <Box
            component="img"
            src="/logo-full.png"
            alt="Vegavruddhi"
            sx={{
              height: 44,
              width: 44,
              objectFit: "contain",
              filter: "brightness(0) invert(1)",   // makes the green logo white on dark nav
              animation: "pulse 3.5s ease-in-out infinite",
            }}
          />
          <Box sx={{ lineHeight: 1 }}>
            <Typography
              sx={{
                fontFamily: "'Georgia', serif",
                fontWeight: 700,
                fontSize: { xs: "0.95rem", md: "1.1rem" },
                color: "#ffffff",
                letterSpacing: 1.8,
                textTransform: "uppercase",
                lineHeight: 1.15,
              }}
            >
              Vegavruddhi
            </Typography>
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: BRAND.accent,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              FSE
            </Typography>
          </Box>
        </Box>

        {/* RIGHT — Tabs + Theme toggle */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tabs
            value={page}
            onChange={(_, v) => setPage(v)}
            textColor="inherit"
          >
            <Tab value="overview"      label="Overview" />
            <Tab value="products"      label="Products" />
            <Tab value="merchants"     label="Merchant Forms" />
            <Tab value="verification"  label="Verification Rules" />
            <Tab value="approvals" label={
              <Badge badgeContent={pendingCount} color="error" max={99} sx={{ '& .MuiBadge-badge': { right: -8, top: -2 } }}>
                <Box sx={{ pr: 2 }}>Approvals</Box>
              </Badge>
            } />
          </Tabs>

          <Box sx={{ width: "1px", height: 28, bgcolor: "rgba(255,255,255,0.15)", mx: 1 }} />

          <Tooltip title={mode === "dark" ? "Light Mode" : "Dark Mode"}>
            <IconButton
              onClick={() => setMode((p) => (p === "light" ? "dark" : "light"))}
              sx={{
                color: "#fff",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                width: 36,
                height: 36,
                "&:hover": {
                  background: "rgba(255,255,255,0.18)",
                  transform: "rotate(22deg) scale(1.1)",
                },
                transition: "all 0.25s ease",
              }}
              size="small"
            >
              {mode === "light" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Box sx={{ width: "1px", height: 28, bgcolor: "rgba(255,255,255,0.15)", mx: 1 }} />

          {/* Username + Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user?.picture && (
              <Box component="img" src={user.picture} alt="avatar"
                sx={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }} />
            )}
            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", mr: 1 }}>
              {user?.username || user?.email}
            </Typography>
          </Box>
          <Tooltip title="Logout">
            <IconButton
              onClick={handleLogout}
              sx={{
                color: "#fff",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                width: 36, height: 36,
                "&:hover": { background: "rgba(239,68,68,0.3)", borderColor: "#ef4444" },
                transition: "all 0.25s ease",
              }}
              size="small"
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── PAGE CONTENT ───────────────────────────────────────────── */}
      <Box
        key={page}
        className="page-enter"
        sx={{
          minHeight: "calc(100vh - 62px)",
          bgcolor: "background.default",
          transition: "background-color 0.3s",
        }}
      >
        {page === "overview"     ? <Dashboard /> :
         page === "products"     ? <ProductDashboard /> :
         page === "merchants"    ? <MerchantForms /> :
         page === "verification" ? <VerificationRules token={user?.token} /> :
         page === "approvals"    ? <EmployeeApprovals /> : null}
      </Box>
      </>)}
    </ThemeProvider>
  );
}

export default App;
