import React, { useState } from "react";
import { Box, Card, CardContent, Typography, Alert } from "@mui/material";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { BRAND } from "../theme";

// Allowed admin emails — add more to REACT_APP_ADMIN_EMAILS in .env (comma-separated)
const ALLOWED_EMAILS = (process.env.REACT_APP_ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export default function Login({ onLogin }) {
  const [error, setError] = useState("");

  const handleSuccess = (credentialResponse) => {
    setError("");
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const email   = (decoded.email || "").toLowerCase();

      if (!ALLOWED_EMAILS.includes(email)) {
        setError(`Access denied. "${decoded.email}" is not authorized to access this dashboard. Contact your administrator.`);
        return;
      }

      const authObj = {
        email,
        username: decoded.name || email,
        picture:  decoded.picture || "",
      };
      localStorage.setItem("vv_auth", JSON.stringify(authObj));
      onLogin(authObj);
    } catch {
      setError("Failed to verify Google account. Please try again.");
    }
  };

  const handleError = () => {
    setError("Google sign-in failed. Please try again.");
  };

  return (
    <Box sx={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #071a0f 0%, #0f3320 50%, #1a5c38 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", px: 2,
    }}>
      {/* Logo */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4 }}>
        <Box component="img" src="/logo-full.png" alt="Vegavruddhi"
          sx={{ height: 52, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        <Box>
          <Typography sx={{
            fontFamily: "'Georgia', serif", fontWeight: 700,
            fontSize: "1.4rem", color: "#fff", letterSpacing: 2,
            textTransform: "uppercase", lineHeight: 1.2,
          }}>
            Vegavruddhi
          </Typography>
          <Typography sx={{
            fontSize: "0.65rem", color: BRAND.accent,
            letterSpacing: 3, textTransform: "uppercase", fontWeight: 600,
          }}>
            Admin Dashboard
          </Typography>
        </Box>
      </Box>

      {/* Card */}
      <Card sx={{ width: "100%", maxWidth: 400, borderRadius: 3, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
        <CardContent sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: BRAND.primary }}>
            Admin Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in with your authorized Google account to access the admin dashboard.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>{error}</Alert>
          )}

          {/* Google Sign-In Button */}
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signin_with_google"
              shape="rectangular"
              width="320"
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
            Only authorized Vegavruddhi admin accounts can sign in.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
