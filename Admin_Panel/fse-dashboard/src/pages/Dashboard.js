import React, { useEffect, useMemo, useState } from "react";
import { fetchData } from "../services/api";

import {
  Box, Typography, useTheme, Card, CardContent
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend, ComposedChart, Line, Cell
} from "recharts";

import KPI from "../components/KPI";
import TLChart from "../components/TLChart";
import TopEmployees from "../components/TopEmployees";
import MeetingTrend from "../components/MeetingTrend";
import ProductChart from "../components/ProductChart";
import EmployeeStatusPie from "../components/EmployeeStatusPie";
import EmploymentTypePie from "../components/EmploymentTypePie";
import EmployeeStatusTable from "../components/EmployeeStatusTable";
import FiltersBar from "../components/FiltersBar";

const COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#14b8a6","#ec4899","#0ea5e9","#ef4444"];

function ChartCard({ title, subtitle, children }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 0.5 }}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{subtitle}</Typography>}
        {children}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [raw, setRaw] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [productMeta, setProductMeta] = useState({ product_columns: [], product_totals: {}, product_groups: {} });
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [filters, setFilters] = useState({ tl: "", employee: "", status: "", employment: "" });

  const muiTheme = useTheme();
  const chartTheme = useMemo(() => {
    const isDark = muiTheme.palette.mode === "dark";
    return {
      background: muiTheme.palette.background.default,
      card: isDark ? "#1e2d3d" : "#ffffff",
      text: muiTheme.palette.text.primary,
      grid: isDark ? "rgba(255,255,255,0.08)" : "rgba(26,92,56,0.15)",
      tooltipBg: isDark ? "#1e2d3d" : "#ffffff",
    };
  }, [muiTheme.palette]);

  const loadData = async () => {
    const result = await fetchData();
    const safeData = Array.isArray(result) ? result : result.raw || [];
    setRaw(safeData);
    if (result && !Array.isArray(result)) {
      setProductMeta({
        product_columns: result.product_columns || [],
        product_totals: result.product_totals || {},
        product_groups: result.product_groups || {}
      });
    }
  };

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 1200000);
    return () => clearInterval(iv);
  }, []);

  // ── Month options from _month tag (same approach as ProductDashboard) ─────
  const monthOptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    (Array.isArray(raw) ? raw : []).forEach((row) => {
      const m = row["_month"];
      if (m && !seen.has(m)) { seen.add(m); result.push(m); }
    });
    result.sort((a, b) => {
      const parse = (s) => { const [mon, yr] = s.split(" "); return parseInt(yr) * 100 + new Date(`${mon} 1`).getMonth(); };
      return parse(a) - parse(b);
    });
    return result;
  }, [raw]);

  // Auto-select latest month
  useEffect(() => {
    if (selectedMonth || monthOptions.length === 0) return;
    setSelectedMonth(monthOptions[monthOptions.length - 1]);
  }, [monthOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered rows using _month tag ────────────────────────────────────────
  const filteredData = useMemo(() => {
    return (Array.isArray(raw) ? raw : []).filter((row) => {
      if (selectedMonth && row["_month"] !== selectedMonth) return false;
      if (filters.tl && row["TL"] !== filters.tl) return false;
      if (filters.employee && row["Name"] !== filters.employee) return false;
      if (filters.status && row["Employee status"] !== filters.status) return false;
      if (filters.employment && row["Employment type"] !== filters.employment) return false;
      return true;
    });
  }, [raw, filters, selectedMonth]);

  // ── NEW: Product Group Breakdown — total per group for selected month ─────
  const groupBreakdownData = useMemo(() => {
    return Object.entries(productMeta.product_groups)
      .map(([group, meta]) => {
        const total = (meta.columns || []).reduce((s, col) =>
          s + filteredData.reduce((rs, r) => rs + (Number(r[col]) || 0), 0), 0
        );
        return { group, total };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [productMeta.product_groups, filteredData]);

  // ── NEW: Month-over-Month KPI comparison (uses raw — all months) ──────────
  const momData = useMemo(() => {
    const map = {};
    (Array.isArray(raw) ? raw : []).forEach((r) => {
      const m = r["_month"] || "Unknown";
      if (!map[m]) map[m] = { month: m, meetings: 0, sales: 0, employees: new Set() };
      map[m].meetings  += Number(r["Total_Meetings_Calc"]) || 0;
      map[m].sales     += Number(r["Total_Product_Sales"]) || 0;
      map[m].employees.add(r["Email ID"]);
    });
    return Object.values(map)
      .map((d) => ({ ...d, employees: d.employees.size }))
      .sort((a, b) => {
        const parse = (s) => { const [mon, yr] = s.split(" "); return parseInt(yr) * 100 + new Date(`${mon} 1`).getMonth(); };
        return parse(a.month) - parse(b.month);
      });
  }, [raw]);

  const tooltipStyle = { backgroundColor: chartTheme.tooltipBg, color: chartTheme.text, border: "none" };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.default", minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ mb: 2 }} >FSE</Typography>

      <FiltersBar
        data={raw}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        filters={filters}
        setFilters={setFilters}
        monthOptions={monthOptions}
      />

      <KPI data={filteredData} theme={chartTheme} />

      {/* PIE charts */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 2 }}>
        <EmployeeStatusPie data={filteredData} theme={chartTheme} setSelectedStatus={setSelectedStatus} setOpenStatusModal={setOpenStatusModal} />
        <EmploymentTypePie data={filteredData} theme={chartTheme} />
      </Box>

      {/* Top Employees + Meeting Trend */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 3 }}>
        <TopEmployees data={filteredData} theme={chartTheme} />
        <MeetingTrend data={filteredData} theme={chartTheme} />
      </Box>

      {/* Product Chart + Product Group Breakdown */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 3 }}>
        <ProductChart data={filteredData} theme={chartTheme} productMeta={productMeta} />

        <ChartCard
          title="Product Group Breakdown"
          subtitle={`Total sales per product group — ${selectedMonth || "all months"}`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={groupBreakdownData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="group" stroke={chartTheme.text} tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={55} />
              <YAxis stroke={chartTheme.text} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="total" name="Total Sales" radius={[6, 6, 0, 0]}
                label={{ position: "top", fontSize: 11, fill: chartTheme.text, formatter: (v) => v > 0 ? v : "" }}>
                {groupBreakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>

      {/* Month-over-Month — full width */}
      <Box sx={{ mt: 3 }}>
        <ChartCard
          title="Month-over-Month Overview"
          subtitle="Meetings, product sales and headcount across all months"
        >
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={momData} margin={{ top: 10, right: 40, left: 0, bottom: 10 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={chartTheme.text} tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis yAxisId="left" stroke={chartTheme.text} allowDecimals={false}
                label={{ value: "Count", angle: -90, position: "insideLeft", fill: chartTheme.text, fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981"
                label={{ value: "Employees", angle: 90, position: "insideRight", fill: "#10b981", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="top" />
              <Bar yAxisId="left" dataKey="meetings" name="Total Meetings" fill="#7c3aed" radius={[4, 4, 0, 0]}
                label={{ position: "top", fontSize: 11, fill: chartTheme.text, formatter: (v) => v > 0 ? v : "" }} />
              <Bar yAxisId="left" dataKey="sales" name="Product Sales" fill="#f59e0b" radius={[4, 4, 0, 0]}
                label={{ position: "top", fontSize: 11, fill: chartTheme.text, formatter: (v) => v > 0 ? v : "" }} />
              <Line yAxisId="right" type="monotone" dataKey="employees" name="Employees"
                stroke="#10b981" strokeWidth={2.5} dot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>

      {/* TL Performance — full width at bottom */}
      <Box sx={{ mt: 3 }}>
        <TLChart data={filteredData} theme={chartTheme} />
      </Box>

      <EmployeeStatusTable
        open={openStatusModal}
        handleClose={() => setOpenStatusModal(false)}
        data={filteredData}
        status={selectedStatus}
      />
    </Box>
  );
}

export default Dashboard;
