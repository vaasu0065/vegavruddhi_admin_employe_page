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
  CartesianGrid, ResponsiveContainer, Cell
} from "recharts";

const COLORS = ["#7c3aed","#3b82f6","#f59e0b","#10b981","#14b8a6","#ec4899","#0ea5e9","#ef4444","#f97316","#84cc16","#06b6d4","#8b5cf6"];

function ProductChart({ data, theme, productMeta }) {
  const [open, setOpen] = useState(false);

  const columns = productMeta?.product_columns?.length > 0
    ? productMeta.product_columns
    : [];

  const chartData = useMemo(() =>
    columns.map((col) => ({
      product: col,
      sales: data.reduce((s, r) => s + (Number(r[col]) || 0), 0),
    }))
    .filter((d) => d.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 12),
  [data, columns]);

  const tooltipStyle = {
    backgroundColor: theme?.tooltipBg || "#fff",
    color: theme?.text || "#000",
    border: "none",
    borderRadius: 8
  };

  return (
    <>
      {/* CARD */}
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Product Sales
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 11, color: "text.secondary" }}>
                Top columns by total sales
              </Typography>
            </Box>

            <Tooltip title="View full table">
              <IconButton size="small" onClick={() => setOpen(true)}>
                <TableChartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* CHART */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="product"
                angle={-25}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis />
              <RTooltip contentStyle={tooltipStyle} />

              <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

        </CardContent>
      </Card>

      {/* DIALOG */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Product Sales — All Columns
          </Typography>

          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>

          <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>

              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Product Column</TableCell>
                  <TableCell>Total Sales</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {chartData.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{r.product}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {r.sales}
                    </TableCell>
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

export default ProductChart;