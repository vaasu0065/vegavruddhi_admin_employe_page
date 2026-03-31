import React, { useMemo, useState } from "react";
import {
  Card, CardContent, Typography, Box, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper
} from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import CloseIcon from "@mui/icons-material/Close";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, ResponsiveContainer, Cell, LabelList
} from "recharts";

const COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#14b8a6","#ec4899","#0ea5e9","#ef4444","#f43f5e","#84cc16"];

function TLChart({ data, theme }) {
  const [open, setOpen] = useState(false);
  const [drillTL, setDrillTL] = useState(null); // TL name for bar-click drill-down

  const chartData = useMemo(() => {
    const map = {};
    data
      .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "")
      .forEach((r) => {
        const tl = r["TL"] || "Unknown";
        if (!map[tl]) map[tl] = { TL: tl, Points: 0, Employees: new Set() };
        map[tl].Points += Number(r["Total_Points"]) || 0;
        map[tl].Employees.add(r["Email ID"].trim());
      });
    return Object.values(map)
      .map((d) => ({ TL: d.TL, Points: Math.round(d.Points * 10) / 10, Employees: d.Employees.size }))
      .filter((d) => d.Points > 0)
      .sort((a, b) => b.Points - a.Points);
  }, [data]);

  const tableRows = useMemo(() => {
    // Deduplicate by email, sum points across months
    const emailMap = {};
    data
      .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "")
      .forEach((r) => {
        const email = r["Email ID"].trim();
        if (!emailMap[email]) emailMap[email] = { name: r["Name"] || email, email, tl: r["TL"] || "", points: 0 };
        emailMap[email].points += Number(r["Total_Points"]) || 0;
      });
    return Object.values(emailMap)
      .map((d) => ({ ...d, points: Math.round(d.points * 10) / 10 }))
      .sort((a, b) => b.points - a.points);
  }, [data]);

  const tooltipStyle = {
    backgroundColor: theme?.tooltipBg || "#fff",
    color: theme?.text || "#000",
    border: "none",
    borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <Box sx={{ bgcolor: tooltipStyle.backgroundColor, color: tooltipStyle.color, p: 1.5, borderRadius: 2, boxShadow: 3, minWidth: 140 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{d.TL}</Typography>
        <Typography sx={{ fontSize: 12, color: COLORS[0] }}>{d.Points} pts</Typography>
        <Typography sx={{ fontSize: 11, opacity: 0.6 }}>{d.Employees} employees</Typography>
      </Box>
    );
  };

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Team Leader Performance</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                Total points per TL — sorted highest to lowest · click a bar to see team
              </Typography>
            </Box>
            <Tooltip title="View full table">
              <IconButton size="small" onClick={() => setOpen(true)} sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}>
                <TableChartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 24, right: 20, left: 10, bottom: 60 }}
              barSize={42}
              barCategoryGap="25%"
            >
              <CartesianGrid stroke={theme?.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="TL"
                stroke={theme?.text}
                tick={{ fontSize: 12, fontWeight: 600, fill: theme?.text }}
                tickLine={false}
                axisLine={{ stroke: theme?.grid }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={65}
              />
              <YAxis
                stroke={theme?.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(124,58,237,0.06)" }} />
              <Bar dataKey="Points" radius={[8, 8, 0, 0]} style={{ cursor: "pointer" }}
                onClick={(barData) => setDrillTL(barData.TL)}>
                <LabelList
                  dataKey="Points"
                  position="top"
                  style={{ fontSize: 12, fontWeight: 700, fill: theme?.text }}
                  formatter={(v) => v > 0 ? v : ""}
                />
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg,#7c3aeddd,#7c3aed88)", color: "#fff"
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>TL Performance — All Employees</Typography>
          <IconButton onClick={() => setOpen(false)} sx={{ color: "#fff" }} size="small">
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
                  <TableCell sx={{ fontWeight: 700, color: "#7c3aed" }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ opacity: 0.5, fontSize: 11 }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                    <TableCell sx={{ opacity: 0.7 }}>{r.email}</TableCell>
                    <TableCell sx={{ opacity: 0.7 }}>{r.tl}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#7c3aed" }}>{r.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
      {/* Bar-click drill-down: employees under selected TL */}
      <Dialog open={!!drillTL} onClose={() => setDrillTL(null)} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg,#7c3aeddd,#7c3aed88)", color: "#fff"
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Team: {drillTL}
          </Typography>
          <IconButton onClick={() => setDrillTL(null)} sx={{ color: "#fff" }} size="small">
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
                  <TableCell sx={{ fontWeight: 700, color: "#7c3aed" }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows
                  .filter((r) => r.tl === drillTL)
                  .map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ opacity: 0.5, fontSize: 11 }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                      <TableCell sx={{ opacity: 0.7 }}>{r.email}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#7c3aed" }}>{r.points}</TableCell>
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

export default TLChart;
