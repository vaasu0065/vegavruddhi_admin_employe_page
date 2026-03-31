import React, { useMemo, useState } from "react";
import {
  Card, CardContent, Typography, Box, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper
} from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import CloseIcon from "@mui/icons-material/Close";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

function TopEmployees({ data, theme }) {
  const [open, setOpen] = useState(false);

  const { chartData, tableRows } = useMemo(() => {
    // Deduplicate by email, sum points across months
    const emailMap = {};
    [...data]
      .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "")
      .forEach((r) => {
        const email = r["Email ID"].trim();
        if (!emailMap[email]) emailMap[email] = { name: r["Name"] || email, email, tl: r["TL"] || "", points: 0 };
        emailMap[email].points += Number(r["Total_Points"]) || 0;
      });
    const sorted = Object.values(emailMap).sort((a, b) => b.points - a.points);
    const chartData = sorted.slice(0, 10).map((d) => ({ ...d, Points: d.points }));
    return { chartData, tableRows: sorted };
  }, [data]);

  const tooltipStyle = { backgroundColor: theme?.tooltipBg || "#fff", color: theme?.text || "#000", border: "none", borderRadius: 8 };

  return (
    <>
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Top 10 Employees</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>Ranked by total points</Typography>
            </Box>
            <Tooltip title="View full table">
              <IconButton size="small" onClick={() => setOpen(true)} sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}>
                <TableChartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart layout="vertical" data={chartData} margin={{ left: 10, right: 40, top: 8, bottom: 8 }}>
              <CartesianGrid stroke={theme?.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={theme?.text} tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke={theme?.text} width={120} tick={{ fontSize: 11 }} tickLine={false} />
              <RTooltip contentStyle={tooltipStyle} formatter={(v, _, p) => [`${v} pts (TL: ${p.payload.tl})`, "Points"]} />
              <Bar dataKey="Points" radius={[0, 6, 6, 0]}
                label={{ position: "right", fontSize: 10, fill: theme?.text, formatter: (v) => v > 0 ? v : "" }}>
                {chartData.map((_, i) => <Cell key={i} fill={`hsl(${260 - i * 8}, 65%, ${58 - i * 1.5}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#10b981dd,#10b98188)", color: "#fff" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>All Employees — Points Ranking</Typography>
          <IconButton onClick={() => setOpen(false)} sx={{ color: "#fff" }} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 460, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>TL</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#10b981" }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ opacity: 0.5, fontSize: 11 }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                    <TableCell sx={{ opacity: 0.7 }}>{r.email}</TableCell>
                    <TableCell sx={{ opacity: 0.7 }}>{r.tl}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#10b981" }}>{r.points}</TableCell>
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

export default TopEmployees;
