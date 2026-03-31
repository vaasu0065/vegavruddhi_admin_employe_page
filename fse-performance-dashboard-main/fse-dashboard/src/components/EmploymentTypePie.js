import React, { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const COLORS = ["#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#e74c3c"];

function EmploymentTypePie({ data, theme }) {
  const [drillSlice, setDrillSlice] = useState(null);

  const typeCount = {};
  data.forEach((item) => {
    const type = item["Employment type"];
    if (!type || type === "Unknown") return;
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  const chartData = Object.keys(typeCount).map((type) => ({ name: type, value: typeCount[type] }));

  // Drill rows for clicked slice — deduplicated by email
  const drillRows = (() => {
    if (!drillSlice) return [];
    const emailMap = {};
    data
      .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "" && r["Employment type"] === drillSlice)
      .forEach((r) => {
        const email = r["Email ID"].trim();
        if (!emailMap[email]) emailMap[email] = { name: r["Name"] || email, email, tl: r["TL"] || "", type: r["Employment type"] || "" };
      });
    return Object.values(emailMap).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const sliceColor = COLORS[chartData.findIndex((d) => d.name === drillSlice) % COLORS.length] || "#3498db";

  return (
    <>
      <div style={{ marginBottom: "20px", padding: "20px", background: theme.card, borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <h2 style={{ color: theme.text }}>Employment Type Distribution</h2>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={120} label
              onClick={(sliceData) => setDrillSlice(sliceData.name)} style={{ cursor: "pointer" }}>
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
                  <TableCell sx={{ fontWeight: 700 }}>Employment Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillRows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ opacity: 0.5, fontSize: 11 }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                    <TableCell sx={{ opacity: 0.7 }}>{r.email}</TableCell>
                    <TableCell sx={{ opacity: 0.7 }}>{r.tl}</TableCell>
                    <TableCell>{r.type}</TableCell>
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

export default EmploymentTypePie;
