import React, { useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Dialog, DialogTitle, DialogContent,
  IconButton, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TableChartIcon from "@mui/icons-material/TableChart";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, ResponsiveContainer, Cell
} from "recharts";

const ACTIVE_KEYWORDS = ["working", "will start", "active"];

function isActiveStatus(s) {
  if (!s) return false;
  return ACTIVE_KEYWORDS.some((kw) => s.toLowerCase().includes(kw));
}

const KPI_COLORS = ["#7c3aed","#3b82f6","#f59e0b","#10b981","#14b8a6"];

function buildStaticKPIs(rows) {
  // Only rows with a valid email — deduplicate by email for employee counts
  const validRows = rows.filter((r) => r["Email ID"] && r["Email ID"].trim() !== "");
  const uniqueEmails = new Set(validRows.map((r) => r["Email ID"].trim()));

  const totalEmployees  = uniqueEmails.size;
  const totalMeetings   = rows.reduce((s, r) => s + (Number(r["Total_Meetings_Calc"]) || 0), 0);
  const avgMeetings     = totalEmployees > 0 ? (totalMeetings / totalEmployees).toFixed(1) : 0;
  const totalSales      = rows.reduce((s, r) => s + (Number(r["Total_Product_Sales"]) || 0), 0);

  // Active: deduplicate by email, keep latest status
  const emailStatusMap = {};
  validRows.forEach((r) => {
    const email = r["Email ID"].trim();
    if (!emailStatusMap[email]) emailStatusMap[email] = r["Employee status"] || "";
  });
  const activeEmployees = Object.values(emailStatusMap).filter((s) => isActiveStatus(s)).length;

  return [
    { label: "Total Employees", value: totalEmployees, color: KPI_COLORS[0], type: "employees" },
    { label: "Total Meetings", value: totalMeetings, color: KPI_COLORS[1], type: "meetings" },
    { label: "Avg Meetings", value: avgMeetings, color: KPI_COLORS[2], type: null },
    { label: "Total Product Sales", value: totalSales, color: KPI_COLORS[3], type: "sales" },
    { label: "Active Employees", value: activeEmployees, color: KPI_COLORS[4], type: "active" },
  ];
}

function KPICard({ label, value, color, type, rows, theme }) {
  const [open, setOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const { chartData, tableRows } = useMemo(() => {
    if (!type || !rows) return { chartData: [], tableRows: [] };

    if (type === "meetings") {
      // Deduplicate by email, sum meetings across months
      const emailMap = {};
      rows
        .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "")
        .forEach((r) => {
          const email = r["Email ID"].trim();
          if (!emailMap[email]) emailMap[email] = { name: r["Name"] || email, email, tl: r["TL"] || "", val: 0 };
          emailMap[email].val += Number(r["Total_Meetings_Calc"]) || 0;
        });
      const data = Object.values(emailMap)
        .filter((d) => d.val > 0)
        .sort((a, b) => b.val - a.val)
        .slice(0, 20);
      return { chartData: data, tableRows: data };
    }

    if (type === "sales") {
      const emailMap = {};
      rows
        .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "")
        .forEach((r) => {
          const email = r["Email ID"].trim();
          if (!emailMap[email]) emailMap[email] = { name: r["Name"] || email, email, tl: r["TL"] || "", val: 0 };
          emailMap[email].val += Number(r["Total_Product_Sales"]) || 0;
        });
      const data = Object.values(emailMap)
        .filter((d) => d.val > 0)
        .sort((a, b) => b.val - a.val)
        .slice(0, 20);
      return { chartData: data, tableRows: data };
    }

    if (type === "employees" || type === "active") {
      // Deduplicate by email, keep latest status
      const emailMap = {};
      rows
        .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "")
        .forEach((r) => {
          const email = r["Email ID"].trim();
          if (!emailMap[email]) emailMap[email] = { name: r["Name"] || email, email, tl: r["TL"] || "", status: r["Employee status"] || "", val: 1 };
        });
      const data = Object.values(emailMap)
        .filter((d) => type === "active" ? isActiveStatus(d.status) : true)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { chartData: [], tableRows: data };
    }

    return { chartData: [], tableRows: [] };
  }, [type, rows]);

  const isClickable = type && (chartData.length > 0 || tableRows.length > 0);

  const tooltipStyle = {
    background: theme?.tooltipBg || "#fff",
    color: theme?.text || "#000",
    borderRadius: 8
  };

  return (
    <>
      <Card
        elevation={0}
        onClick={isClickable ? () => setOpen(true) : undefined}
        sx={{
          borderRadius: 3,
          border: "1.5px solid",
          borderColor: "divider",
          cursor: isClickable ? "pointer" : "default",
        }}
      >
        <Box sx={{ height: 5, bgcolor: color, borderRadius: "3px 3px 0 0" }} />

        <CardContent>
          <Typography>{label}</Typography>
          <Typography sx={{ fontWeight: 800, color }}>{value}</Typography>

          {isClickable && (
            <Typography sx={{ fontSize: 10, opacity: 0.5 }}>
              click to explore ↗
            </Typography>
          )}
        </CardContent>
      </Card>

      {isClickable && (
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
          <DialogTitle>
            {label}
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent>
            {chartData.length > 0 && !showTable && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RTooltip />
                  <Bar dataKey="val">
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>TL</TableCell>
                    <TableCell>{type === "employees" ? "Status" : label}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {tableRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.tl}</TableCell>
                      <TableCell>
                        {type === "employees" ? r.status : r.val}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

              </Table>
            </TableContainer>

          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function KPI({ data, theme }) {
  const rows = Array.isArray(data) ? data : [];
  const kpis = useMemo(() => buildStaticKPIs(rows), [rows]);

  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 2
    }}>
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} rows={rows} theme={theme} />
      ))}
    </Box>
  );
}

export default KPI;