import React, { useMemo, useState } from "react";
import {
  Card, CardContent, Typography, Box, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper
} from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import CloseIcon from "@mui/icons-material/Close";
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, ResponsiveContainer } from "recharts";

function MeetingTrend({ data, theme }) {
  const [open, setOpen] = useState(false);

  const chartData = useMemo(() => {
    const trend = {};
    const dateKeys = data.length > 0
      ? Object.keys(data[0]).filter((col) => !Number.isNaN(new Date(col).getTime()))
      : [];
    data.forEach((item) => {
      dateKeys.forEach((col) => {
        const m = Number(item[col]) || 0;
        if (m > 0) trend[col] = (trend[col] || 0) + m;
      });
    });
    return Object.keys(trend).sort().map((date) => ({ date, meetings: trend[date] }));
  }, [data]);

  const tooltipStyle = { backgroundColor: theme?.tooltipBg || "#fff", color: theme?.text || "#000", border: "none", borderRadius: 8 };

  return (
    <>
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Meeting Trend</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>Daily meeting activity</Typography>
            </Box>
            <Tooltip title="View data table">
              <IconButton size="small" onClick={() => setOpen(true)} sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}>
                <TableChartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={theme?.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={theme?.text} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke={theme?.text} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <RTooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="meetings" stroke="#3b82f6" strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b82f6", stroke: "#fff", strokeWidth: 1.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#3b82f6dd,#3b82f688)", color: "#fff" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Meeting Trend — Daily Data</Typography>
          <IconButton onClick={() => setOpen(false)} sx={{ color: "#fff" }} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 420, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#3b82f6" }}>Total Meetings</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chartData.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ opacity: 0.5, fontSize: 11 }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.date}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#3b82f6" }}>{r.meetings}</TableCell>
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

export default MeetingTrend;
