import React, { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const statusGroups = {
  Active: ["Working", "Workng", "Will start work for 21 feb"],
  Resigned: ["Resigned"],
  Terminated: ["Termination Sent", "Termination based on PIP"],
  "Offer Issues": ["Offer letter pending", "Offer Revoked", "Offer Revoked - PIP"],
  Left: ["Left", "Left - never started"]
};

const COLORS = ["#2ecc71", "#e74c3c", "#f39c12", "#3498db", "#9b59b6", "#95a5a6"];

function EmployeeStatusPie({ data, theme, setSelectedStatus, setOpenStatusModal }) {
  const [drillSlice, setDrillSlice] = useState(null);

  const statusCount = { Active: 0, Resigned: 0, Terminated: 0, "Offer Issues": 0, Left: 0, Other: 0 };

  data.forEach((item) => {
    const status = item["Employee status"];
    if (!status || status === "Unknown") return;
    let found = false;
    Object.keys(statusGroups).forEach((group) => {
      if (statusGroups[group].includes(status)) { statusCount[group] += 1; found = true; }
    });
    if (!found) statusCount["Other"] += 1;
  });

  const chartData = Object.keys(statusCount)
    .map((key) => ({ name: key, value: statusCount[key] }))
    .filter((item) => item.value > 0);

  const handlePieClick = (sliceData) => {
    setDrillSlice(sliceData.name);
  };

  // Build drill rows for clicked slice — deduplicated by email
  const drillRows = (() => {
    if (!drillSlice) return [];
    const emailMap = {};
    data
      .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "")
      .forEach((r) => {
        const status = r["Employee status"] || "";
        let group = "Other";
        Object.keys(statusGroups).forEach((g) => {
          if (statusGroups[g].includes(status)) group = g;
        });
        if (group !== drillSlice) return;
        const email = r["Email ID"].trim();
        if (!emailMap[email]) emailMap[email] = { name: r["Name"] || email, email, tl: r["TL"] || "", status };
      });
    return Object.values(emailMap).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const sliceColor = COLORS[chartData.findIndex((d) => d.name === drillSlice) % COLORS.length] || "#7c3aed";

  return (
    <>
      <div style={{ marginBottom: "20px", padding: "20px", background: theme.card, borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <h2 style={{ color: theme.text }}>Employee Status Distribution</h2>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={120} label onClick={handlePieClick} style={{ cursor: "pointer" }}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: theme.tooltipBg, color: theme.text }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <Dialog open={!!drillSlice} onClose={() => setDrillSlice(null)} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `linear-gradient(135deg,${sliceColor}dd,${sliceColor}88)`, color: "#fff"
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {drillSlice} — {drillRows.length} employee{drillRows.length !== 1 ? "s" : ""}
          </Typography>
          <IconButton onClick={() => setDrillSlice(null)} sx={{ color: "#fff" }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TableContainer component={Paper} elevation={0}
            sx={{ maxHeight: 460, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>TL</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillRows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ opacity: 0.5, fontSize: 11 }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                    <TableCell sx={{ opacity: 0.7 }}>{r.email}</TableCell>
                    <TableCell sx={{ opacity: 0.7 }}>{r.tl}</TableCell>
                    <TableCell>{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EmployeeStatusPie;
