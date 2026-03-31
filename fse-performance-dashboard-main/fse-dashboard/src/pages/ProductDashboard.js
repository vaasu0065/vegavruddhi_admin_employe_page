import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, useTheme, Chip, IconButton, Tooltip as MuiTooltip,
  Collapse, Button, Divider, Dialog, DialogTitle, DialogContent,
  Table, TableHead, TableRow, TableCell, TableBody, TextField, CircularProgress
} from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line, Label,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Brush
} from "recharts";

import { fetchData, updateRow } from "../services/api";
import FiltersBar from "../components/FiltersBar";
import TideDrillTable from "../components/TideDrillTable";
import MeetingTrend from "../components/MeetingTrend";

const COLORS = ["#7c3aed", "#10b981", "#3b82f6", "#f59e0b", "#14b8a6", "#ec4899", "#0ea5e9", "#ef4444"];

function toChartTheme(muiTheme) {
  const isDark = muiTheme.palette.mode === "dark";
  return {
    background: muiTheme.palette.background.default,
    card: isDark ? "#1e2d3d" : "#ffffff",
    text: muiTheme.palette.text.primary,
    grid: isDark ? "rgba(255,255,255,0.08)" : "rgba(26,92,56,0.15)",
    tooltipBg: isDark ? "#1e2d3d" : "#ffffff",
  };
}

// ── KPI strip ──────────────────────────────────────────────────────────────
function TideKPI({ rows, tideColumns, ct, openDrill, onboardCol }) {
  const KPI_COLORS = ["#7c3aed","#14b8a6","#10b981","#f59e0b","#3b82f6","#ec4899","#0ea5e9","#ef4444","#f97316","#84cc16","#06b6d4","#8b5cf6"];

  const [kpiModal, setKpiModal] = useState(null); // { label, col, color, chartData }

  const kpis = tideColumns.map((col, i) => ({
    label: col,
    col,
    value: rows.reduce((s, r) => s + (Number(r[col]) || 0), 0),
    color: KPI_COLORS[i % KPI_COLORS.length],
  }));

  const allAppliedIdx = kpis.findIndex((k) => k.label === "Tide (All applied cases)");
  const onboardIdx    = kpis.findIndex((k) => k.label === onboardCol);
  if (allAppliedIdx !== -1 && onboardIdx !== -1) {
    const applied = kpis[allAppliedIdx]?.value || 0;
    const ob      = kpis[onboardIdx]?.value    || 0;
    kpis.splice(onboardIdx + 1, 0, {
      label: "Pending (Not Onboarded)", col: null,
      value: Math.max(0, applied - ob), color: "#ef4444"
    });
  }

  const totalPoints = rows.reduce((s, r) => s + (Number(r["Total_Points"]) || 0), 0);
  kpis.push({ label: "Total Points (All Products)", col: "Total_Points", value: Math.round(totalPoints * 10) / 10, color: "#6366f1" });

  const openKpiModal = (k) => {
    if (!k.col) return; // Pending is computed, no raw col
    const chartData = rows
      .filter((r) => (Number(r[k.col]) || 0) > 0)
      .map((r) => ({ name: r["Name"] || "Unknown", tl: r["TL"] || "", value: Number(r[k.col]) || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
    setKpiModal({ ...k, chartData });
  };

  const isDark = ct ? ct.tooltipBg === "#1f1f1f" : false;

  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, mb: 3 }}>
        {kpis.map((k) => (
          <Card key={k.label} variant="outlined"
            onClick={() => openKpiModal(k)}
            sx={{
              opacity: k.value === 0 ? 0.5 : 1,
              transition: "all 0.2s",
              cursor: k.col ? "pointer" : "default",
              borderColor: "divider",
              "&:hover": k.col ? {
                borderColor: k.color,
                transform: "translateY(-2px)",
                boxShadow: `0 4px 20px ${k.color}33`,
              } : {},
            }}>
            <CardContent sx={{ textAlign: "center", py: 1.5, px: 1.5 }}>
              <Typography variant="body2" color="text.secondary"
                sx={{ fontSize: 10, mb: 0.5, lineHeight: 1.3, minHeight: 28 }}>
                {k.label}
              </Typography>
              <Typography variant="h5"
                sx={{ color: k.value === 0 ? "text.disabled" : k.color, fontWeight: 800, fontSize: "1.6rem" }}>
                {k.value}
              </Typography>
              {k.col && k.value > 0 && (
                <Typography variant="caption" sx={{ opacity: 0.4, fontSize: 9 }}>click to explore</Typography>
              )}
              {k.value === 0 && (
                <Typography variant="caption" sx={{ opacity: 0.35, fontSize: 9 }}>no data this month</Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* KPI drill-down modal */}
      {kpiModal && (
        <Dialog open={!!kpiModal} onClose={() => setKpiModal(null)} maxWidth="md" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
          {/* Colored header */}
          <Box sx={{
            background: `linear-gradient(135deg, ${kpiModal.color}cc, ${kpiModal.color}66)`,
            px: 3, py: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>{kpiModal.label}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12, mt: 0.3 }}>
                Top {kpiModal.chartData.length} employees · {kpiModal.value} total
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <MuiTooltip title="View full editable table">
                <IconButton size="small"
                  onClick={() => { setKpiModal(null); openDrill(`${kpiModal.label} — All Employees`, rows.filter((r) => (Number(r[kpiModal.col]) || 0) > 0).sort((a, b) => (Number(b[kpiModal.col]) || 0) - (Number(a[kpiModal.col]) || 0)), [kpiModal.col]); }}
                  sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                  <TableChartIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
              <IconButton size="small" onClick={() => setKpiModal(null)}
                sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                <FullscreenExitIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3, bgcolor: "background.paper" }}>
            {kpiModal.chartData.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>No employee data found.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, kpiModal.chartData.length * 28)}>
                <BarChart
                  layout="vertical"
                  data={kpiModal.chartData}
                  margin={{ left: 10, right: 60, top: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="kpiBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={kpiModal.color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={kpiModal.color} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} horizontal={false} />
                  <XAxis type="number" stroke={ct?.text} allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke={ct?.text} width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: ct?.tooltipBg, color: ct?.text, border: "none", borderRadius: 8 }}
                    formatter={(val, _, props) => [`${val}  (TL: ${props.payload.tl})`, kpiModal.label]}
                    cursor={{ fill: `${kpiModal.color}18` }}
                  />
                  <Bar dataKey="value" name={kpiModal.label} fill="url(#kpiBarGrad)"
                    radius={[0, 8, 8, 0]}
                    label={{ position: "right", fontSize: 11, fill: ct?.text, fontWeight: 700,
                      formatter: (v) => v > 0 ? v : "" }}
                  >
                    {kpiModal.chartData.map((_, i) => (
                      <Cell key={i}
                        fill={`hsla(${parseInt(kpiModal.color.slice(1), 16) % 360}, 70%, ${60 - i * 1.5}%, ${1 - i * 0.025})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Reusable chart card ─────────────────────────────────────────────────────
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

// ── Other Products KPI strip ────────────────────────────────────────────────
const OTHER_PRODUCT_COLS = [
  { col: "Vehicle Insurance",    label: "Vehicle Insurance",    color: "#10b981" },
  { col: "Vehicle Points Earned",label: "Vehicle Points Earned",color: "#3b82f6" },
  { col: "Aditya Birla",         label: "Aditya Birla",         color: "#f59e0b" },
  { col: "Airtel Payments Bank", label: "Airtel Payments Bank", color: "#ec4899" },
  { col: "Hero FinCorp",         label: "Hero FinCorp",         color: "#7c3aed" },
];

function OtherProductKPI({ rows, openDrill }) {
  const [kpiModal, setKpiModal] = useState(null);

  const kpis = OTHER_PRODUCT_COLS.map((k) => ({
    ...k,
    value: rows.reduce((s, r) => s + (Number(r[k.col]) || 0), 0),
  }));

  const openKpiModal = (k) => {
    if (k.value === 0) return;
    const chartData = rows
      .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "" && (Number(r[k.col]) || 0) > 0)
      .reduce((acc, r) => {
        const email = r["Email ID"].trim();
        const existing = acc.find((x) => x.email === email);
        if (existing) { existing.value += Number(r[k.col]) || 0; }
        else acc.push({ name: r["Name"] || email, email, tl: r["TL"] || "", value: Number(r[k.col]) || 0 });
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
    setKpiModal({ ...k, chartData });
  };

  return (
    <>
      <Box sx={{ mb: 1, mt: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, mb: 1 }}>
          Other Products
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, mb: 3 }}>
          {kpis.map((k) => (
            <Card key={k.col} variant="outlined"
              onClick={() => openKpiModal(k)}
              sx={{
                opacity: k.value === 0 ? 0.5 : 1,
                cursor: k.value > 0 ? "pointer" : "default",
                transition: "all 0.2s",
                "&:hover": k.value > 0 ? {
                  borderColor: k.color,
                  transform: "translateY(-2px)",
                  boxShadow: `0 4px 20px ${k.color}33`,
                } : {},
              }}>
              <CardContent sx={{ textAlign: "center", py: 1.5, px: 1.5 }}>
                <Typography variant="body2" color="text.secondary"
                  sx={{ fontSize: 10, mb: 0.5, lineHeight: 1.3, minHeight: 28 }}>
                  {k.label}
                </Typography>
                <Typography variant="h5"
                  sx={{ color: k.value === 0 ? "text.disabled" : k.color, fontWeight: 800, fontSize: "1.6rem" }}>
                  {k.value}
                </Typography>
                {k.value > 0
                  ? <Typography variant="caption" sx={{ opacity: 0.4, fontSize: 9 }}>click to explore</Typography>
                  : <Typography variant="caption" sx={{ opacity: 0.35, fontSize: 9 }}>no data this month</Typography>}
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {kpiModal && (
        <Dialog open={!!kpiModal} onClose={() => setKpiModal(null)} maxWidth="md" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
          <Box sx={{
            background: `linear-gradient(135deg, ${kpiModal.color}cc, ${kpiModal.color}66)`,
            px: 3, py: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>{kpiModal.label}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12, mt: 0.3 }}>
                Top {kpiModal.chartData.length} employees · {kpiModal.value} total
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <MuiTooltip title="View full editable table">
                <IconButton size="small"
                  onClick={() => {
                    setKpiModal(null);
                    openDrill(`${kpiModal.label} — All Employees`,
                      rows.filter((r) => (Number(r[kpiModal.col]) || 0) > 0)
                          .sort((a, b) => (Number(b[kpiModal.col]) || 0) - (Number(a[kpiModal.col]) || 0)),
                      [kpiModal.col]);
                  }}
                  sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                  <TableChartIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
              <IconButton size="small" onClick={() => setKpiModal(null)}
                sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                <FullscreenExitIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <DialogContent sx={{ p: 3, bgcolor: "background.paper" }}>
            {kpiModal.chartData.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>No employee data found.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, kpiModal.chartData.length * 28)}>
                <BarChart layout="vertical" data={kpiModal.chartData} margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                  <CartesianGrid stroke="rgba(0,0,0,0.08)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val, _, props) => [`${val}  (TL: ${props.payload.tl})`, kpiModal.label]}
                    cursor={{ fill: `${kpiModal.color}18` }}
                  />
                  <Bar dataKey="value" name={kpiModal.label} fill={kpiModal.color} radius={[0, 8, 8, 0]}
                    label={{ position: "right", fontSize: 11, fontWeight: 700, formatter: (v) => v > 0 ? v : "" }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Inline editable table (no dialog, renders directly in page) ────────────
const IDENTITY_COLS = ["Name", "Email ID", "TL", "Employee status"];

function InlineEditTable({ rows, editableCols, onReload }) {
  const [localRows, setLocalRows] = useState(() => rows.map((r) => ({ ...r })));
  const [editing, setEditing]     = useState({});
  const [saving, setSaving]       = useState({});
  const [saved, setSaved]         = useState({});
  const [errors, setErrors]       = useState({});

  // Re-sync when rows change (month switch / filter change)
  useEffect(() => { setLocalRows(rows.map((r) => ({ ...r }))); setEditing({}); setSaved({}); setErrors({}); }, [rows]);

  const displayCols = [...IDENTITY_COLS, ...editableCols];
  const k = (i, col) => `${i}_${col}`;

  const handleSave = async (i, col, row) => {
    const key = k(i, col);
    const val = editing[key];
    if (val === undefined || val === "") return;
    setSaving((p) => ({ ...p, [key]: true }));
    try {
      const res = await updateRow(row["Email ID"], col, Number(val));
      if (res.success) {
        setLocalRows((prev) => { const n = [...prev]; n[i] = { ...n[i], [col]: Number(val) }; return n; });
        setSaved((p) => ({ ...p, [key]: true }));
        setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2000);
        setEditing((p) => { const n = { ...p }; delete n[key]; return n; });
        onReload(); // refresh cache in background
      } else {
        setErrors((p) => ({ ...p, [key]: res.error || "Failed" }));
      }
    } catch { setErrors((p) => ({ ...p, [key]: "Network error" })); }
    setSaving((p) => ({ ...p, [key]: false }));
  };

  if (localRows.length === 0) return <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>No records.</Typography>;

  return (
    <Box sx={{ overflowX: "auto", maxHeight: 420, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>#</TableCell>
            {displayCols.map((c) => (
              <TableCell key={c} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", bgcolor: editableCols.includes(c) ? "action.hover" : undefined }}>
                {c}
                {editableCols.includes(c) && <Typography variant="caption" sx={{ display: "block", opacity: 0.45, fontSize: 9 }}>editable</Typography>}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {localRows.map((row, i) => (
            <TableRow key={i} hover>
              <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>{i + 1}</TableCell>
              {displayCols.map((col) => {
                const key = k(i, col);
                const isEditable = editableCols.includes(col);
                const isEditing  = editing[key] !== undefined;
                return (
                  <TableCell key={col} sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                    {isEditable ? (
                      isEditing ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <TextField size="small" type="number" value={editing[key]}
                            onChange={(e) => setEditing((p) => ({ ...p, [key]: e.target.value }))}
                            sx={{ width: 72 }} autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") handleSave(i, col, row); if (e.key === "Escape") setEditing((p) => { const n = { ...p }; delete n[key]; return n; }); }}
                          />
                          {saving[key]
                            ? <CircularProgress size={14} />
                            : <Button size="small" variant="contained" sx={{ minWidth: 0, px: 1, fontSize: 11 }} onClick={() => handleSave(i, col, row)}>✓</Button>}
                          <Button size="small" sx={{ minWidth: 0, px: 0.5, fontSize: 11 }} onClick={() => setEditing((p) => { const n = { ...p }; delete n[key]; return n; })}>✕</Button>
                          {errors[key] && <Typography color="error" variant="caption" sx={{ fontSize: 10 }}>{errors[key]}</Typography>}
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer" }}
                          onClick={() => setEditing((p) => ({ ...p, [key]: row[col] ?? 0 }))}>
                          {saved[key]
                            ? <Chip label="✓" color="success" size="small" sx={{ height: 18, fontSize: 10 }} />
                            : <strong>{row[col] ?? 0}</strong>}
                          <span style={{ fontSize: 10, opacity: 0.35 }}>✏️</span>
                        </Box>
                      )
                    ) : (
                      String(row[col] ?? "—")
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function ProductDashboard() {
  const muiTheme = useTheme();
  const ct = useMemo(() => toChartTheme(muiTheme), [muiTheme]);

  const [raw, setRaw] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [filters, setFilters] = useState({ tl: "", employee: "", status: "", employment: "" });
  const [productMeta, setProductMeta] = useState({ product_columns: [], product_totals: {}, product_groups: {} });
  const [onboardColMap, setOnboardColMap] = useState({ byMonth: {}, default: "Tide OB with PP" });

  // drill-down state
  const [drill, setDrill] = useState({ open: false, title: "", rows: [], editableCols: undefined });
  const openDrill = (title, rows, editableCols) => setDrill({ open: true, title, rows, editableCols: editableCols || undefined });
  const closeDrill = () => setDrill((p) => ({ ...p, open: false }));

  // employee profile popup state (custom chart bar click)
  const [empProfile, setEmpProfile] = useState(null); // { name, email, tl, status, employment, kpis: [{label, value, color}] }

  const openEmpProfile = (employeeName) => {
    // Aggregate all rows for this employee across the current filtered data
    const empRows = rows.filter((r) => r["Name"] === employeeName);
    if (empRows.length === 0) return;
    const ref = empRows[0];
    const allCols = allProductCols.length > 0 ? allProductCols : selectedCols;
    const KPI_COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#14b8a6","#ec4899","#0ea5e9","#ef4444","#f97316","#84cc16","#06b6d4","#8b5cf6"];
    const kpis = allCols
      .map((col, i) => ({
        label: col,
        value: empRows.reduce((s, r) => s + (Number(r[col]) || 0), 0),
        color: KPI_COLORS[i % KPI_COLORS.length],
      }))
      .filter((k) => k.value > 0)
      .sort((a, b) => b.value - a.value);
    const totalPoints = empRows.reduce((s, r) => s + (Number(r["Total_Points"]) || 0), 0);
    setEmpProfile({
      name: employeeName,
      email: ref["Email ID"] || "",
      tl: ref["TL"] || "",
      status: ref["Employee status"] || "",
      employment: ref["Employment type"] || "",
      totalPoints: Math.round(totalPoints * 10) / 10,
      kpis,
    });
  };

  // ── Custom chart column selector state ──────────────────────────────────
  const [selectedCols, setSelectedCols] = useState([]);
  const [selectorOpen, setSelectorOpen] = useState(true);
  const [chartZoomed, setChartZoomed] = useState(340);
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [showCustomTable, setShowCustomTable] = useState(false);
  const [groupBy, setGroupBy] = useState("employee"); // "employee" | "tl"

  const toggleCol = (col) =>
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  const load = async () => {
    const result = await fetchData();
    const safeRaw = Array.isArray(result) ? result : result.raw || [];
    setRaw(safeRaw);
    if (result && !Array.isArray(result)) {
      setProductMeta({
        product_columns: result.product_columns || [],
        product_totals: result.product_totals || {},
        product_groups: result.product_groups || {}
      });
      setOnboardColMap({
        byMonth: result.onboard_column_by_month || {},
        default: result.default_onboard_column || "Tide OB with PP",
      });
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 120000);
    return () => clearInterval(iv);
  }, []);

  // ── Detect available months from _month tag ──────────────────────────────
  const monthOptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    (Array.isArray(raw) ? raw : []).forEach((row) => {
      const m = row["_month"];
      if (m && !seen.has(m)) { seen.add(m); result.push(m); }
    });
    // Sort chronologically using month name parsing
    result.sort((a, b) => {
      const parse = (s) => { const [mon, yr] = s.split(" "); return parseInt(yr) * 100 + new Date(`${mon} 1`).getMonth(); };
      return parse(a) - parse(b);
    });
    return result;
  }, [raw]);

  // ── Auto-select latest month on first load ─────────────────────────────────
  useEffect(() => {
    if (selectedMonth || monthOptions.length === 0) return;
    setSelectedMonth(monthOptions[monthOptions.length - 1]);
  }, [monthOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── filtered rows — filter by _month tag, then by other filters ───────────
  const rows = useMemo(() => {
    return (Array.isArray(raw) ? raw : []).filter((row) => {
      // Month filter: use _month tag which is set per-sheet on the backend
      if (selectedMonth && row["_month"] !== selectedMonth) return false;
      if (filters.tl && row["TL"] !== filters.tl) return false;
      if (filters.employee && row["Name"] !== filters.employee) return false;
      if (filters.status && row["Employee status"] !== filters.status) return false;
      if (filters.employment && row["Employment type"] !== filters.employment) return false;
      return true;
    });
  }, [raw, filters, selectedMonth]);

  // ── Onboard column — changes per month based on backend config ───────────
  // Hardcoded fallback in case backend hasn't restarted yet
  const FRONTEND_ONBOARD_FALLBACK = {
    "January 2026":  "Tide OB with PP",
    "February 2026": "Tide OB with PP",
    "March 2026":    "Tide OB with PP + 5K QR Load + 4 Txns",
  };
  const onboardCol =
    (onboardColMap.byMonth && onboardColMap.byMonth[selectedMonth]) ||
    FRONTEND_ONBOARD_FALLBACK[selectedMonth] ||
    onboardColMap.default ||
    "Tide OB with PP";

  // // ── CHART 1: Tide OB vs OB with PP by TL (pending per TL) ─────────────────
  // const tlPendingData = useMemo(() => {
  //   const map = {};
  //   rows.forEach((r) => {
  //     const tl = r["TL"] || "Unknown";
  //     if (!map[tl]) map[tl] = { tl, ob: 0, pp: 0 };
  //     map[tl].ob += Number(r["Tide OB"]) || 0;
  //     map[tl].pp += Number(r["Tide OB with PP"]) || 0;
  //   });
  //   return Object.values(map)
  //     .map((d) => ({ ...d, pending: d.ob - d.pp }))
  //     .filter((d) => d.ob > 0)
  //     .sort((a, b) => b.pending - a.pending);
  // }, [rows]);

  // // ── CHART 2: Conversion rate OB → PP per TL ───────────────────────────────
  // const conversionData = useMemo(() => {
  //   return tlPendingData
  //     .filter((d) => d.ob > 0)
  //     .map((d) => ({
  //       tl: d.tl,
  //       rate: Math.round((d.pp / d.ob) * 100),
  //       ob: d.ob,
  //       pp: d.pp
  //     }))
  //     .sort((a, b) => b.rate - a.rate);
  // }, [tlPendingData]);

  // ── CHART 3: Offer Revoked employees who still have Tide OB ───────────────
  const revokedWithTide = useMemo(() => {
    return rows.filter(
      (r) => r["Offer letter status"] === "Offer Revoked" && (Number(r["Tide OB"]) || 0) > 0
    );
  }, [rows]);

  const revokedByTL = useMemo(() => {
    const map = {};
    revokedWithTide.forEach((r) => {
      const tl = r["TL"] || "Unknown";
      map[tl] = (map[tl] || 0) + 1;
    });
    return Object.entries(map).map(([tl, count]) => ({ tl, count })).sort((a, b) => b.count - a.count);
  }, [revokedWithTide]);

  // ── CHART 1 data: All Applied Cases vs Correct Referral Code by TL ─────────
  const appliedVsRefData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const tl = r["TL"] || "Unknown";
      if (!map[tl]) map[tl] = { tl, allApplied: 0, correctRef: 0 };
      map[tl].allApplied += Number(r["Tide (All applied cases)"]) || 0;
      map[tl].correctRef += Number(r["Tide OB(with correct ref. code)"]) || 0;
    });
    return Object.values(map).filter((d) => d.allApplied > 0).sort((a, b) => b.allApplied - a.allApplied);
  }, [rows]);

  // Rows sorted to match graph order (by allApplied desc, then by TL order in chart)
  const appliedVsRefTableRows = useMemo(() => {
    const tlOrder = appliedVsRefData.map((d) => d.tl);
    return rows
      .filter((r) => (Number(r["Tide (All applied cases)"]) || 0) > 0)
      .sort((a, b) => {
        const ai = tlOrder.indexOf(a["TL"] || "Unknown");
        const bi = tlOrder.indexOf(b["TL"] || "Unknown");
        if (ai !== bi) return ai - bi;
        return (Number(b["Tide (All applied cases)"]) || 0) - (Number(a["Tide (All applied cases)"]) || 0);
      });
  }, [rows, appliedVsRefData]);

  // ── CHART 2 data: Onboarded Tide — All Applied Cases vs onboard col by TL ─
  const onboardedTideData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const tl = r["TL"] || "Unknown";
      if (!map[tl]) map[tl] = { tl, allApplied: 0, obWithPP: 0 };
      map[tl].allApplied += Number(r["Tide (All applied cases)"]) || 0;
      map[tl].obWithPP  += Number(r[onboardCol]) || 0;
    });
    return Object.values(map)
      .filter((d) => d.allApplied > 0)
      .map((d) => ({ ...d, gap: d.allApplied - d.obWithPP }))
      .sort((a, b) => b.allApplied - a.allApplied);
  }, [rows, onboardCol]);

  // ── CHART 3 data: UPI Done vs PPI by Employee (independent, not related) ──
  const upiVsPpiData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide OB (UPI - BC011+QRPPVV01)"]) || 0) > 0 || (Number(r["Tide - PPI"]) || 0) > 0)
      .map((r) => ({
        name:    r["Name"] || "Unknown",
        tl:      r["TL"]   || "Unknown",
        upi:     Number(r["Tide OB (UPI - BC011+QRPPVV01)"]) || 0,
        ppi:     Number(r["Tide - PPI"]) || 0,
      }))
      .sort((a, b) => (b.upi + b.ppi) - (a.upi + a.ppi))
      .slice(0, 20);
  }, [rows]);

  const upiVsPpiTableRows = useMemo(() => {
    const nameOrder = upiVsPpiData.map((d) => d.name);
    return rows
      .filter((r) => (Number(r["Tide OB (UPI - BC011+QRPPVV01)"]) || 0) > 0 || (Number(r["Tide - PPI"]) || 0) > 0)
      .sort((a, b) => {
        const ai = nameOrder.indexOf(a["Name"] || "Unknown");
        const bi = nameOrder.indexOf(b["Name"] || "Unknown");
        if (ai !== -1 && bi !== -1) return ai - bi;
        return (Number(b["Tide OB (UPI - BC011+QRPPVV01)"]) || 0) - (Number(a["Tide OB (UPI - BC011+QRPPVV01)"]) || 0);
      });
  }, [rows, upiVsPpiData]);

  const onboardedTideTableRows = useMemo(() => {
    const tlOrder = onboardedTideData.map((d) => d.tl);
    return rows
      .filter((r) => (Number(r["Tide (All applied cases)"]) || 0) > 0)
      .sort((a, b) => {
        const ai = tlOrder.indexOf(a["TL"] || "Unknown");
        const bi = tlOrder.indexOf(b["TL"] || "Unknown");
        if (ai !== bi) return ai - bi;
        return (Number(b["Tide (All applied cases)"]) || 0) - (Number(a["Tide (All applied cases)"]) || 0);
      });
  }, [rows, onboardedTideData]);
  // ── Tide columns — derived from backend product_columns, filtered to Tide ──
  const tideColumns = useMemo(() => {
    const detected = productMeta.product_columns.filter((c) => c.toLowerCase().includes("tide"));
    // If backend hasn't loaded yet, fall back to empty (KPI/charts will show 0)
    return detected;
  }, [productMeta.product_columns]);

  // ── All product columns (all groups) for the column selector ─────────────
  const allProductCols = useMemo(() => productMeta.product_columns, [productMeta.product_columns]);

  // ── Custom chart data — grouped by Employee or TL based on groupBy state ─
  const customChartData = useMemo(() => {
    if (selectedCols.length === 0) return [];
    const map = {};
    rows.forEach((r) => {
      const key = groupBy === "tl" ? (r["TL"] || "Unknown") : (r["Name"] || "Unknown");
      if (!map[key]) {
        map[key] = { key, tl: r["TL"] || "", name: r["Name"] || "" };
        selectedCols.forEach((c) => { map[key][c] = 0; });
      }
      selectedCols.forEach((c) => { map[key][c] += Number(r[c]) || 0; });
    });
    return Object.values(map)
      .filter((d) => selectedCols.some((c) => d[c] > 0))
      .sort((a, b) => {
        const sumA = selectedCols.reduce((s, c) => s + (a[c] || 0), 0);
        const sumB = selectedCols.reduce((s, c) => s + (b[c] || 0), 0);
        return sumB - sumA;
      });
  }, [selectedCols, rows, groupBy]);

  // ── CHART 4 donut: dynamic product breakdown from detected Tide columns ───
  const productBreakdown = useMemo(() => {
    const DONUT_COLORS = ["#7c3aed","#14b8a6","#10b981","#f59e0b","#3b82f6","#ec4899","#0ea5e9","#ef4444","#f97316","#84cc16"];
    return tideColumns.map((col, i) => ({
      name:  col.replace(/^Tide\s*/i, "").trim() || col,  // strip "Tide " prefix for shorter labels
      col,
      value: rows.reduce((s, r) => s + (Number(r[col]) || 0), 0),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    })).filter((d) => d.value > 0);
  }, [tideColumns, rows]);

  // ── CHART 5: Employees with pending transactions (OB > PP) ────────────────
  const pendingEmployees = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide OB"]) || 0) > (Number(r["Tide OB with PP"]) || 0))
      .map((r) => ({
        ...r,
        pending: (Number(r["Tide OB"]) || 0) - (Number(r["Tide OB with PP"]) || 0)
      }))
      .sort((a, b) => b.pending - a.pending);
  }, [rows]);

  // ── CHART 5 data: Correct Ref Code vs Incorrect Ref Code by TL ─────────────
  const refCodeData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const tl = r["TL"] || "Unknown";
      if (!map[tl]) map[tl] = { tl, correct: 0, incorrect: 0 };
      map[tl].correct   += Number(r["Tide OB(with correct ref. code)"]) || 0;
      map[tl].incorrect += Number(r["Tide - incorrect referral code"]) || 0;
    });
    return Object.values(map)
      .filter((d) => d.correct > 0 || d.incorrect > 0)
      .map((d) => ({
        ...d,
        total:       d.correct + d.incorrect,
        correctPct:  d.correct + d.incorrect > 0 ? Math.round((d.correct / (d.correct + d.incorrect)) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const refCodeTableRows = useMemo(() => {
    const tlOrder = refCodeData.map((d) => d.tl);
    return rows
      .filter((r) => (Number(r["Tide OB(with correct ref. code)"]) || 0) > 0 || (Number(r["Tide - incorrect referral code"]) || 0) > 0)
      .sort((a, b) => {
        const ai = tlOrder.indexOf(a["TL"] || "Unknown");
        const bi = tlOrder.indexOf(b["TL"] || "Unknown");
        if (ai !== bi) return ai - bi;
        return (Number(b["Tide OB(with correct ref. code)"]) || 0) - (Number(a["Tide OB(with correct ref. code)"]) || 0);
      });
  }, [rows, refCodeData]);

  // ── CHART 6 data: Correct vs Incorrect Referral Code by Employee ────────────
  const refCodeByEmpData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide OB(with correct ref. code)"]) || 0) > 0 || (Number(r["Tide - incorrect referral code"]) || 0) > 0)
      .map((r) => {
        const correct   = Number(r["Tide OB(with correct ref. code)"]) || 0;
        const incorrect = Number(r["Tide - incorrect referral code"]) || 0;
        const total     = correct + incorrect;
        return {
          name:       r["Name"] || "Unknown",
          tl:         r["TL"]   || "Unknown",
          correct,
          incorrect,
          total,
          correctPct: total > 0 ? Math.round((correct / total) * 100) : 0
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }, [rows]);

  const refCodeByEmpTableRows = useMemo(() => {
    const nameOrder = refCodeByEmpData.map((d) => d.name);
    return rows
      .filter((r) => (Number(r["Tide OB(with correct ref. code)"]) || 0) > 0 || (Number(r["Tide - incorrect referral code"]) || 0) > 0)
      .sort((a, b) => {
        const ai = nameOrder.indexOf(a["Name"] || "Unknown");
        const bi = nameOrder.indexOf(b["Name"] || "Unknown");
        if (ai !== -1 && bi !== -1) return ai - bi;
        return (Number(b["Tide OB(with correct ref. code)"]) || 0) - (Number(a["Tide OB(with correct ref. code)"]) || 0);
      });
  }, [rows, refCodeByEmpData]);

  // ── CHART 7 data: Tide MSME by Employee ──────────────────────────────────
  const msmData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide MSME"]) || 0) > 0)
      .map((r) => ({
        name:  r["Name"] || "Unknown",
        tl:    r["TL"]   || "Unknown",
        msme:  Number(r["Tide MSME"]) || 0,
      }))
      .sort((a, b) => b.msme - a.msme)
      .slice(0, 15);
  }, [rows]);

  // ── CHART 8 data: Tide Insurance by Employee ──────────────────────────────
  const insData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide Insurance"]) || 0) > 0)
      .map((r) => ({
        name: r["Name"] || "Unknown",
        tl:   r["TL"]   || "Unknown",
        ins:  Number(r["Tide Insurance"]) || 0,
      }))
      .sort((a, b) => b.ins - a.ins)
      .slice(0, 15);
  }, [rows]);

  // ── CHART 8b data: OB with PP + 5K QR Load + 4 Txns by Employee ─────────
  const qrData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide OB with PP + 5K QR Load + 4 Txns"]) || 0) > 0)
      .map((r) => ({
        name: r["Name"] || "Unknown",
        tl:   r["TL"]   || "Unknown",
        qr:   Number(r["Tide OB with PP + 5K QR Load + 4 Txns"]) || 0,
      }))
      .sort((a, b) => b.qr - a.qr)
      .slice(0, 15);
  }, [rows]);

  // ── CHART 9 data: All Tide product columns — count + % of All Applied Cases ──
  // Fully dynamic — uses tideColumns detected by backend, no hardcoding needed
  const allProductsData = useMemo(() => {
    const totalApplied = rows.reduce((s, r) => s + (Number(r["Tide (All applied cases)"]) || 0), 0);
    return tideColumns.map((col) => {
      const sales = rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
      const pct   = totalApplied > 0 ? Math.round((sales / totalApplied) * 100) : 0;
      // Short label: strip "Tide " prefix for readability on X-axis
      const product = col.replace(/^Tide\s*/i, "").trim() || col;
      return { product, col, sales, pct };
    }).filter((d) => d.sales > 0);
  }, [tideColumns, rows]);

  // ── Points Breakdown data — contribution per product to Total_Points ────
  // Uses exact same formula as feature_engineering.py points_formula
  const POINTS_FORMULA = [
    { col: "Tide OB with PP",       weight: 2,   label: "Tide OB with PP",       color: "#7c3aed" },
    { col: "Tide Insurance",         weight: 1,   label: "Tide Insurance",         color: "#f59e0b" },
    { col: "Tide MSME",              weight: 0.3, label: "Tide MSME (×0.3)",       color: "#3b82f6" },
    { col: "Vehicle Points Earned",  weight: 1,   label: "Vehicle Points Earned",  color: "#10b981" },
    { col: "Aditya Birla",           weight: 1,   label: "Aditya Birla",           color: "#ec4899" },
    { col: "Airtel Payments Bank",   weight: 1,   label: "Airtel Payments Bank",   color: "#0ea5e9" },
    { col: "Tide",                   weight: 1,   label: "Tide (base)",            color: "#14b8a6" },
    { col: "Hero FinCorp",           weight: 1,   label: "Hero FinCorp",           color: "#f97316" },
  ];

  const pointsBreakdownData = useMemo(() => {
    return POINTS_FORMULA
      .map(({ col, weight, label, color }) => {
        const units  = rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
        const points = Math.round(units * weight * 10) / 10;
        const pct    = 0; // filled below
        return { label, col, weight, units, points, color };
      })
      .filter((d) => d.units > 0)
      .sort((a, b) => b.points - a.points)
      .map((d, _, arr) => {
        const total = arr.reduce((s, x) => s + x.points, 0);
        return { ...d, pct: total > 0 ? Math.round((d.points / total) * 100) : 0 };
      });
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const conversionByMonthData = useMemo(() => {
    const map = {};
    (Array.isArray(raw) ? raw : []).forEach((r) => {
      const month = r["_month"] || "Unknown";
      // Use the correct onboard column for each month
      const monthOnboardCol =
        (onboardColMap.byMonth && onboardColMap.byMonth[month]) ||
        FRONTEND_ONBOARD_FALLBACK[month] ||
        onboardColMap.default ||
        "Tide OB with PP";
      if (!map[month]) map[month] = { month, applied: 0, obWithPP: 0, onboardCol: monthOnboardCol };
      map[month].applied  += Number(r["Tide (All applied cases)"]) || 0;
      map[month].obWithPP += Number(r[monthOnboardCol]) || 0;
    });
    return Object.values(map)
      .filter((d) => d.applied > 0)
      .map((d) => ({
        ...d,
        rate: Math.round((d.obWithPP / d.applied) * 100),
        pending: d.applied - d.obWithPP,
      }))
      .sort((a, b) => {
        const parse = (s) => {
          const [mon, yr] = (s || "").split(" ");
          return parseInt(yr || 0) * 100 + (new Date(`${mon} 1`).getMonth() + 1 || 0);
        };
        return parse(a.month) - parse(b.month);
      });
  }, [raw, onboardColMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const tooltipStyle = { backgroundColor: ct.tooltipBg, color: ct.text, border: "none" };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.default", minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Tide Product Analytics</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click any bar or slice to see the employee drill-down table. Click a number in the table to edit and sync to Google Sheet.
      </Typography>

      <FiltersBar
        data={raw}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        filters={filters}
        setFilters={setFilters}
        monthOptions={monthOptions}
      />

      <TideKPI rows={rows} tideColumns={tideColumns} ct={ct} openDrill={openDrill} onboardCol={onboardCol} />

      <OtherProductKPI rows={rows} openDrill={openDrill} />

      {/* ── Custom Column Chart ─────────────────────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ pb: "16px !important" }}>

          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Custom Column Chart</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11, mt: 0.3 }}>
                Pick any product columns below — chart updates instantly for the selected month
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0, ml: 2 }}>
              <Button
                size="small" variant="outlined"
                onClick={() => setSelectedCols(allProductCols.filter((c) => rows.some((r) => (Number(r[c]) || 0) > 0)))}
                sx={{ fontSize: 11, textTransform: "none", borderRadius: 2 }}
              >
                Select All
              </Button>
              <Button
                size="small" variant="outlined" color="error"
                onClick={() => setSelectedCols([])}
                sx={{ fontSize: 11, textTransform: "none", borderRadius: 2 }}
              >
                Clear
              </Button>
              <IconButton size="small" onClick={() => setSelectorOpen((p) => !p)} sx={{ ml: 0.5 }}>
                {selectorOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>
          </Box>

          {/* Pill selector panel */}
          <Collapse in={selectorOpen}>
            <Box sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2,
              bgcolor: muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            }}>
              {Object.entries(productMeta.product_groups).map(([group, meta], gi) => {
                const GROUP_COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#ec4899","#14b8a6","#ef4444","#0ea5e9"];
                const groupColor = GROUP_COLORS[gi % GROUP_COLORS.length];
                const cols = meta.columns || [];
                if (cols.length === 0) return null;
                return (
                  <Box key={group} sx={{ mb: gi < Object.keys(productMeta.product_groups).length - 1 ? 2 : 0 }}>
                    {/* Group label with colored left border */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Box sx={{ width: 3, height: 16, borderRadius: 1, bgcolor: groupColor, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: groupColor, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 10 }}>
                        {group}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.4, fontSize: 10 }}>
                        ({cols.filter((c) => rows.some((r) => (Number(r[c]) || 0) > 0)).length}/{cols.length} active)
                      </Typography>
                    </Box>
                    {/* Pill chips */}
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                      {cols.map((col) => {
                        const hasData = rows.some((r) => (Number(r[col]) || 0) > 0);
                        const isSelected = selectedCols.includes(col);
                        const total = rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
                        return (
                          <Chip
                            key={col}
                            label={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                <span style={{ fontSize: 11 }}>{col}</span>
                                {hasData && (
                                  <Box component="span" sx={{
                                    fontSize: 10, fontWeight: 700,
                                    bgcolor: isSelected ? "rgba(255,255,255,0.25)" : (muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
                                    borderRadius: 1, px: 0.6, py: 0.1, lineHeight: 1.6,
                                  }}>
                                    {total}
                                  </Box>
                                )}
                              </Box>
                            }
                            onClick={hasData ? () => toggleCol(col) : undefined}
                            size="small"
                            variant={isSelected ? "filled" : "outlined"}
                            sx={{
                              cursor: hasData ? "pointer" : "default",
                              opacity: hasData ? 1 : 0.3,
                              borderColor: isSelected ? groupColor : "divider",
                              bgcolor: isSelected ? groupColor : "transparent",
                              color: isSelected ? "#fff" : "text.primary",
                              fontWeight: isSelected ? 600 : 400,
                              transition: "all 0.15s ease",
                              "&:hover": hasData ? {
                                bgcolor: isSelected ? groupColor : `${groupColor}22`,
                                borderColor: groupColor,
                              } : {},
                              "& .MuiChip-label": { px: 1 },
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Collapse>

          {/* Selected summary + chart */}
          {selectedCols.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {/* Group-by toggle */}
              <Box sx={{
                display: "flex", alignItems: "center", gap: 1.5, mb: 2,
                p: 1.5, borderRadius: 2,
                bgcolor: muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                border: "1px solid", borderColor: "divider",
              }}>
                <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, fontSize: 10, flexShrink: 0 }}>
                  Group by:
                </Typography>
                {[
                  { value: "employee", label: "Employee" },
                  { value: "tl",       label: "Team Leader" },
                ].map(({ value, label }) => (
                  <Box
                    key={value}
                    onClick={() => setGroupBy(value)}
                    sx={{
                      px: 2, py: 0.6, borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      transition: "all 0.18s ease",
                      bgcolor: groupBy === value ? "primary.main" : "transparent",
                      color: groupBy === value ? "#fff" : "text.secondary",
                      border: "1.5px solid",
                      borderColor: groupBy === value ? "primary.main" : "divider",
                      "&:hover": { borderColor: "primary.main", color: groupBy === value ? "#fff" : "primary.main" },
                    }}
                  >
                    {label}
                  </Box>
                ))}
                <Typography variant="caption" sx={{ ml: "auto", opacity: 0.45, fontSize: 10 }}>
                  {customChartData.length} {groupBy === "tl" ? "team leaders" : "employees"} · {selectedCols.length} column{selectedCols.length > 1 ? "s" : ""}
                </Typography>
              </Box>

              {/* Selected chips summary */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                {selectedCols.map((col, i) => (
                  <Chip
                    key={col}
                    label={col}
                    size="small"
                    onDelete={() => toggleCol(col)}
                    sx={{ fontSize: 10, bgcolor: COLORS[i % COLORS.length], color: "#fff", "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.7)" } }}
                  />
                ))}
              </Box>

              {customChartData.length > 0 ? (
                <>
                  {/* Zoom + action controls */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5, justifyContent: "flex-end" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: "auto", fontSize: 11 }}>
                      Drag the brush to pan · zoom buttons adjust height
                    </Typography>
                    <MuiTooltip title="Zoom out">
                      <span>
                        <IconButton size="small" onClick={() => setChartZoomed((h) => Math.max(240, h - 120))} disabled={chartZoomed <= 240}>
                          <ZoomOutIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </MuiTooltip>
                    <Typography variant="caption" sx={{ minWidth: 36, textAlign: "center", opacity: 0.5, fontSize: 11 }}>
                      {chartZoomed}px
                    </Typography>
                    <MuiTooltip title="Zoom in">
                      <span>
                        <IconButton size="small" onClick={() => setChartZoomed((h) => Math.min(900, h + 120))} disabled={chartZoomed >= 900}>
                          <ZoomInIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </MuiTooltip>
                    <MuiTooltip title={showCustomTable ? "Hide table" : "Show editable table"}>
                      <IconButton size="small" onClick={() => setShowCustomTable((p) => !p)}
                        sx={{ color: showCustomTable ? "primary.main" : "inherit" }}>
                        <TableChartIcon fontSize="small" />
                      </IconButton>
                    </MuiTooltip>
                    <MuiTooltip title="Fullscreen">
                      <IconButton size="small" onClick={() => setChartFullscreen(true)}>
                        <FullscreenIcon fontSize="small" />
                      </IconButton>
                    </MuiTooltip>
                  </Box>

                  <ResponsiveContainer width="100%" height={chartZoomed}>
                    <BarChart
                      data={customChartData}
                      barCategoryGap="28%" barGap={4}
                      margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
                      onClick={(e) => {
                        if (!e?.activePayload) return;
                        const d = e.activePayload[0]?.payload;
                        if (groupBy === "tl") {
                          openDrill(`TL: ${d.key} — Custom Selection`, rows.filter((r) => r["TL"] === d.key), selectedCols);
                        } else {
                          openEmpProfile(d.key);
                        }
                      }}
                    >
                      <CartesianGrid stroke={ct.grid} strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="key"
                        stroke={ct.text}
                        tick={{ fontSize: 11, fill: ct.text }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                        tickLine={false}
                        axisLine={{ stroke: ct.grid }}
                      />
                      <YAxis
                        stroke={ct.text}
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: ct.text }}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: ct.tooltipBg, color: ct.text, border: "none", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                        cursor={{ fill: muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
                        formatter={(val, colName, props) =>
                          groupBy === "employee"
                            ? [val, `${colName} (TL: ${props.payload.tl})`]
                            : [val, colName]
                        }
                      />
                      <Legend
                        verticalAlign="top"
                        wrapperStyle={{ paddingBottom: 8, fontSize: 12 }}
                      />
                      {selectedCols.map((col, i) => (
                        <Bar
                          key={col}
                          dataKey={col}
                          name={col}
                          fill={COLORS[i % COLORS.length]}
                          radius={[5, 5, 0, 0]}
                          style={{ cursor: "pointer" }}
                          label={{ position: "top", fontSize: 10, fill: ct.text, formatter: (v) => v > 0 ? v : "" }}
                        />
                      ))}
                      <Brush
                        dataKey="key"
                        height={20}
                        stroke={ct.grid}
                        fill={muiTheme.palette.background.paper}
                        travellerWidth={8}
                        startIndex={0}
                        endIndex={Math.min(customChartData.length - 1, 11)}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Inline editable table — shown when table icon is toggled */}
                  <Collapse in={showCustomTable}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      Editable Table — {selectedCols.length} column{selectedCols.length > 1 ? "s" : ""} · {rows.filter((r) => selectedCols.some((c) => (Number(r[c]) || 0) > 0)).length} employees
                    </Typography>
                    {/* Reuse TideDrillTable in inline mode via a wrapper */}
                    <InlineEditTable
                      rows={rows.filter((r) => selectedCols.some((c) => (Number(r[c]) || 0) > 0))
                        .sort((a, b) => {
                          const sumA = selectedCols.reduce((s, c) => s + (Number(a[c]) || 0), 0);
                          const sumB = selectedCols.reduce((s, c) => s + (Number(b[c]) || 0), 0);
                          return sumB - sumA;
                        })}
                      editableCols={selectedCols}
                      theme={ct}
                      onReload={load}
                    />
                  </Collapse>
                </>
              ) : (
                <Box sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>
                  <Typography variant="body2">No data for selected columns in this month.</Typography>
                </Box>
              )}
            </Box>
          )}

          {selectedCols.length === 0 && !selectorOpen && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: "center", opacity: 0.6 }}>
              Expand the panel and select columns to generate a chart.
            </Typography>
          )}
          {selectedCols.length === 0 && selectorOpen && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: "center", opacity: 0.6 }}>
              Click any pill above to add it to the chart.
            </Typography>
          )}

        </CardContent>
      </Card>

      {/* Fullscreen chart dialog */}
      <Dialog open={chartFullscreen} onClose={() => setChartFullscreen(false)} maxWidth="xl" fullWidth
        PaperProps={{ sx: { height: "90vh", display: "flex", flexDirection: "column" } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box>
            <Typography variant="h6">Custom Column Chart — Fullscreen</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedCols.length} column{selectedCols.length > 1 ? "s" : ""} · drag the brush to pan
            </Typography>
          </Box>
          <IconButton onClick={() => setChartFullscreen(false)}><FullscreenExitIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, display: "flex", flexDirection: "column", pt: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={customChartData}
              barCategoryGap="22%" barGap={3}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              onClick={(e) => {
                if (!e?.activePayload) return;
                const d = e.activePayload[0]?.payload;
                setChartFullscreen(false);
                if (groupBy === "tl") {
                  openDrill(`TL: ${d.key} — Custom Selection`, rows.filter((r) => r["TL"] === d.key), selectedCols);
                } else {
                  openDrill(`${d.key} — Custom Selection`, rows.filter((r) => r["Name"] === d.key), selectedCols);
                }
              }}
            >
              <CartesianGrid stroke={ct.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="key" stroke={ct.text} tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke={ct.text} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: ct.tooltipBg, color: ct.text, border: "none", borderRadius: 8 }}
                formatter={(val, colName, props) =>
                  groupBy === "employee"
                    ? [val, `${colName} (TL: ${props.payload.tl})`]
                    : [val, colName]
                }
              />
              <Legend verticalAlign="top" />
              {selectedCols.map((col, i) => (
                <Bar key={col} dataKey={col} name={col} fill={COLORS[i % COLORS.length]} radius={[5, 5, 0, 0]} style={{ cursor: "pointer" }}
                  label={{ position: "top", fontSize: 11, fill: ct.text, formatter: (v) => v > 0 ? v : "" }}
                />
              ))}
              <Brush
                dataKey="key"
                height={24}
                stroke={ct.grid}
                fill={muiTheme.palette.background.paper}
                travellerWidth={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </DialogContent>
      </Dialog>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, gridAutoFlow: "dense" }}>

        {/* CHART 1 — All Applied Cases vs Correct Referral Code by TL */}
        {appliedVsRefData.length > 0 && (
        <ChartCard
          title="Tide: All Applied Cases vs Correct Referral Code by TL"
          subtitle="Compare total applied cases against those with correct referral codes per Team Leader"
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table sorted by chart order">
              <IconButton
                size="small"
                onClick={() => openDrill("All Applied Cases vs Correct Referral Code — by TL", appliedVsRefTableRows, ["Tide (All applied cases)", "Tide OB(with correct ref. code)"])}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={appliedVsRefData}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const tl = e.activePayload[0]?.payload?.tl;
                  openDrill(`TL: ${tl} — Applied vs Correct Ref`, rows.filter((r) => r["TL"] === tl && (Number(r["Tide (All applied cases)"]) || 0) > 0).sort((a, b) => (Number(b["Tide (All applied cases)"]) || 0) - (Number(a["Tide (All applied cases)"]) || 0)), ["Tide (All applied cases)", "Tide OB(with correct ref. code)"]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
                <XAxis dataKey="tl" stroke={ct.text} tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis stroke={ct.text} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="allApplied" name="All Applied Cases" fill="#7c3aed" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
                <Bar dataKey="correctRef" name="Correct Referral Code" fill="#14b8a6" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 2 — Onboarded Tide */}
        {onboardedTideData.length > 0 && (
        <ChartCard
          title="Onboarded Tide"
          subtitle={`All Applied Cases vs ${onboardCol} per TL — line shows gap (not yet onboarded)`}
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table sorted by chart order">
              <IconButton
                size="small"
                onClick={() => openDrill("Onboarded Tide — by TL", onboardedTideTableRows, ["Tide (All applied cases)", onboardCol])}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={onboardedTideData}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const tl = e.activePayload[0]?.payload?.tl;
                  openDrill(`TL: ${tl} — Onboarded Tide`, rows.filter((r) => r["TL"] === tl && (Number(r["Tide (All applied cases)"]) || 0) > 0).sort((a, b) => (Number(b["Tide (All applied cases)"]) || 0) - (Number(a["Tide (All applied cases)"]) || 0)), ["Tide (All applied cases)", onboardCol]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
                <XAxis dataKey="tl" stroke={ct.text} tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis yAxisId="left" stroke={ct.text} />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" tickFormatter={(v) => v} label={{ value: "Gap", angle: 90, position: "insideRight", fill: "#ef4444", fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, name) => [val, name]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="allApplied" name="All Applied Cases" fill="#7c3aed" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
                <Bar yAxisId="left" dataKey="obWithPP" name={onboardCol} fill="#10b981" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
                <Line yAxisId="right" type="monotone" dataKey="gap" name="Gap (not onboarded)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: "#ef4444" }} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 3 — UPI vs PPI Transaction Breakdown by Employee */}
        {upiVsPpiData.length > 0 && (
        <ChartCard
          title="UPI vs PPI Transactions by Employee"
          subtitle="Side-by-side comparison — UPI (BC011+QRPPVV01) and PPI are independent payment methods"
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table sorted by chart order">
              <IconButton
                size="small"
                onClick={() => openDrill("UPI vs PPI — by Employee", upiVsPpiTableRows, ["Tide OB (UPI - BC011+QRPPVV01)", "Tide - PPI"])}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={upiVsPpiData}
                barCategoryGap="20%"
                barGap={3}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const name = e.activePayload[0]?.payload?.name;
                  openDrill(`Employee: ${name} — UPI vs PPI`, rows.filter((r) => r["Name"] === name), ["Tide OB (UPI - BC011+QRPPVV01)", "Tide - PPI"]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={ct.text} tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis stroke={ct.text} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, name) => [val, name]}
                />
                <Legend />
                <Bar dataKey="upi" name="Tide OB (UPI)" fill="#3b82f6" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
                <Bar dataKey="ppi" name="Tide - PPI" fill="#f59e0b" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 4 — Tide Product Mix (enhanced donut) */}
        {productBreakdown.length > 0 && (
        <ChartCard
          title="Tide Product Mix"
          subtitle="All Tide transaction types — click a slice to drill into employees"
        >
          <Box sx={{ position: "relative" }}>
            {/* Total count — top-left corner */}
            <Box sx={{ position: "absolute", top: 4, left: 4, zIndex: 2, lineHeight: 1.2 }}>
              <Typography variant="caption" sx={{ color: ct.text, opacity: 0.55, display: "block", fontSize: 11 }}>Total</Typography>
              <Typography variant="h6" sx={{ color: ct.text, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
                {productBreakdown.reduce((s, d) => s + d.value, 0)}
              </Typography>
            </Box>
            <MuiTooltip title="View full table for all Tide columns">
              <IconButton
                size="small"
                onClick={() => openDrill("Tide Product Mix — All Employees", rows.filter((r) => productBreakdown.some((d) => (Number(r[d.col]) || 0) > 0)), tideColumns)}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={360}>
              <PieChart>
                <Pie
                  data={productBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={130}
                  paddingAngle={3}
                  onClick={(entry) => {
                    if (entry?.col) openDrill(`${entry.name} — Employee Breakdown`, rows.filter((r) => (Number(r[entry.col]) || 0) > 0), [entry.col]);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {productBreakdown.map((d, i) => (
                    <Cell key={i} fill={d.color || COLORS[i % COLORS.length]} stroke={ct.card} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, name) => [val, name]}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(value, entry) => (
                    <span style={{ color: ct.text, fontSize: 12 }}>
                      {value} <strong style={{ color: entry.color }}>{entry.payload.value}</strong>
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 5 — Correct vs Incorrect Referral Code by TL */}
        {refCodeData.length > 0 && (
        <ChartCard
          title="Referral Code Quality by Team Leader"
          subtitle="Correct vs incorrect referral codes per TL — line shows correct code success rate %"
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table sorted by chart order">
              <IconButton
                size="small"
                onClick={() => openDrill("Referral Code Quality — by TL", refCodeTableRows, ["Tide OB(with correct ref. code)", "Tide - incorrect referral code"])}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={refCodeData}
                barCategoryGap="25%"
                barGap={4}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const tl = e.activePayload[0]?.payload?.tl;
                  openDrill(`TL: ${tl} — Referral Code Quality`, refCodeTableRows.filter((r) => r["TL"] === tl), ["Tide OB(with correct ref. code)", "Tide - incorrect referral code"]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
                <XAxis dataKey="tl" stroke={ct.text} tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis yAxisId="left" stroke={ct.text} allowDecimals={false} label={{ value: "Count", angle: -90, position: "insideLeft", fill: ct.text, fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" unit="%" domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={{ value: "Success %", angle: 90, position: "insideRight", fill: "#10b981", fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, name) => name === "Correct Code %" ? [`${val}%`, name] : [val, name]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="correct" name="Correct Referral Code" fill="#10b981" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
                <Bar yAxisId="left" dataKey="incorrect" name="Incorrect Referral Code" fill="#ef4444" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
                <Line yAxisId="right" type="monotone" dataKey="correctPct" name="Correct Code %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 6 — Correct vs Incorrect Referral Code by Employee */}
        {refCodeByEmpData.length > 0 && (
        <ChartCard
          title="Referral Code Quality by Employee"
          subtitle="Top 20 employees — correct vs incorrect referral codes. Line = correct code success rate %"
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table sorted by chart order">
              <IconButton
                size="small"
                onClick={() => openDrill("Referral Code Quality — by Employee", refCodeByEmpTableRows, ["Tide OB(with correct ref. code)", "Tide - incorrect referral code"])}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={refCodeByEmpData}
                barCategoryGap="25%"
                barGap={4}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const name = e.activePayload[0]?.payload?.name;
                  openDrill(`Employee: ${name} — Referral Code Quality`, rows.filter((r) => r["Name"] === name), ["Tide OB(with correct ref. code)", "Tide - incorrect referral code"]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={ct.text} tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis yAxisId="left" stroke={ct.text} allowDecimals={false} label={{ value: "Count", angle: -90, position: "insideLeft", fill: ct.text, fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" unit="%" domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={{ value: "Success %", angle: 90, position: "insideRight", fill: "#10b981", fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, name) => name === "Correct Code %" ? [`${val}%`, name] : [val, name]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="correct" name="Correct Referral Code" fill="#10b981" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
                <Bar yAxisId="left" dataKey="incorrect" name="Incorrect Referral Code" fill="#ef4444" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
                <Line yAxisId="right" type="monotone" dataKey="correctPct" name="Correct Code %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 7 — Tide MSME by Employee */}
        {msmData.length > 0 && (
        <ChartCard
          title="Tide MSME — Top 15 Employees"
          subtitle="Employees with highest Tide MSME count — horizontal bars for easy name reading"
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table">
              <IconButton
                size="small"
                onClick={() => openDrill("Tide MSME — All Employees", rows.filter((r) => (Number(r["Tide MSME"]) || 0) > 0).sort((a, b) => (Number(b["Tide MSME"]) || 0) - (Number(a["Tide MSME"]) || 0)), ["Tide MSME"])}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={msmData}
                layout="vertical"
                margin={{ left: 10, right: 30 }}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const name = e.activePayload[0]?.payload?.name;
                  openDrill(`Employee: ${name} — Tide MSME`, rows.filter((r) => r["Name"] === name), ["Tide MSME"]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke={ct.text} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke={ct.text} width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, _, props) => [`${val} (TL: ${props.payload.tl})`, "Tide MSME"]}
                />
                <Bar dataKey="msme" name="Tide MSME" radius={[0, 6, 6, 0]} style={{ cursor: "pointer" }}>
                  {msmData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${200 + i * 8}, 70%, ${55 - i * 1.5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 8 (new) — Tide Insurance by Employee */}
        {insData.length > 0 && (
        <ChartCard
          title="Tide Insurance — Top 15 Employees"
          subtitle="Employees with highest Tide Insurance count — click a bar to drill down"
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table">
              <IconButton
                size="small"
                onClick={() => openDrill("Tide Insurance — All Employees", rows.filter((r) => (Number(r["Tide Insurance"]) || 0) > 0).sort((a, b) => (Number(b["Tide Insurance"]) || 0) - (Number(a["Tide Insurance"]) || 0)), ["Tide Insurance"])}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={insData}
                layout="vertical"
                margin={{ left: 10, right: 30 }}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const name = e.activePayload[0]?.payload?.name;
                  openDrill(`Employee: ${name} — Tide Insurance`, rows.filter((r) => r["Name"] === name), ["Tide Insurance"]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke={ct.text} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke={ct.text} width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, _, props) => [`${val} (TL: ${props.payload.tl})`, "Tide Insurance"]}
                />
                <Bar dataKey="ins" name="Tide Insurance" radius={[0, 6, 6, 0]} style={{ cursor: "pointer" }}>
                  {insData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${150 + i * 6}, 65%, ${50 - i * 1.5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 8b — OB with PP + 5K QR Load + 4 Txns by Employee */}
        {qrData.length > 0 && (
        <ChartCard
          title="Tide OB with PP + 5K QR Load + 4 Txns — Top 15"
          subtitle="Employees with highest count for this combined condition — click a bar to drill down"
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table">
              <IconButton
                size="small"
                onClick={() => openDrill(
                  "OB with PP + 5K QR Load + 4 Txns — All Employees",
                  rows.filter((r) => (Number(r["Tide OB with PP + 5K QR Load + 4 Txns"]) || 0) > 0)
                      .sort((a, b) => (Number(b["Tide OB with PP + 5K QR Load + 4 Txns"]) || 0) - (Number(a["Tide OB with PP + 5K QR Load + 4 Txns"]) || 0)),
                  ["Tide OB with PP + 5K QR Load + 4 Txns"]
                )}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={qrData}
                layout="vertical"
                margin={{ left: 10, right: 40 }}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const name = e.activePayload[0]?.payload?.name;
                  openDrill(`Employee: ${name} — QR Load`, rows.filter((r) => r["Name"] === name), ["Tide OB with PP + 5K QR Load + 4 Txns"]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke={ct.text} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke={ct.text} width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, _, props) => [`${val} (TL: ${props.payload.tl})`, "OB+PP+5K QR+4Txns"]}
                />
                <Bar dataKey="qr" name="OB+PP+5K QR+4Txns" radius={[0, 6, 6, 0]} style={{ cursor: "pointer" }}>
                  {qrData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${88 + i * 6}, 65%, ${50 - i * 1.5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 9 — All Tide Products Breakdown with % */}
        {allProductsData.length > 0 && (
        <ChartCard
          title="All Tide Products — Volume & Share"
          subtitle="Every Tide product column: total count + % share of all applied cases. Click a bar to drill down."
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table for all Tide products">
              <IconButton
                size="small"
                onClick={() => openDrill("All Tide Products — All Employees", rows.filter((r) => allProductsData.some((d) => (Number(r[d.col]) || 0) > 0)), allProductsData.map((d) => d.col))}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart
                data={allProductsData}
                margin={{ top: 20, right: 50, left: 10, bottom: 80 }}
                onClick={(e) => {
                  if (!e?.activePayload) return;
                  const d = e.activePayload[0]?.payload;
                  if (!d) return;
                  openDrill(`${d.product} — Employee Breakdown`, rows.filter((r) => (Number(r[d.col]) || 0) > 0).sort((a, b) => (Number(b[d.col]) || 0) - (Number(a[d.col]) || 0)), [d.col]);
                }}
              >
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="product"
                  stroke={ct.text}
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={90}
                />
                <YAxis yAxisId="left" stroke={ct.text} allowDecimals={false} label={{ value: "Count", angle: -90, position: "insideLeft", fill: ct.text, fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#a78bfa" unit="%" domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={{ value: "% of Applied", angle: 90, position: "insideRight", fill: "#a78bfa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, name) => name === "% of Applied" ? [`${val}%`, name] : [val, name]}
                  labelFormatter={(label) => `Product: ${label}`}
                />
                <Legend verticalAlign="top" />
                <Bar yAxisId="left" dataKey="sales" name="Total Count" radius={[6, 6, 0, 0]} style={{ cursor: "pointer" }} label={{ position: "top", fontSize: 11, fill: ct.text, formatter: (v) => v > 0 ? v : "" }}>
                  {allProductsData.map((d, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="pct" name="% of Applied" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 5, fill: "#a78bfa", strokeWidth: 2, stroke: "#fff" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* CHART 10 — Tide Onboarding Conversion Rate by Month */}
        {conversionByMonthData.length > 0 && (
        <ChartCard
          title="Tide Onboarding Conversion Rate by Month"
          subtitle="All Applied Cases vs Onboarded (column varies by month) — conversion rate % across Jan, Feb, Mar."
        >
          <Box sx={{ position: "relative" }}>
            <MuiTooltip title="View full table for all months">
              <IconButton
                size="small"
                onClick={() => openDrill(
                  "Tide Conversion — All Months",
                  (Array.isArray(raw) ? raw : []).filter((r) => (Number(r["Tide (All applied cases)"]) || 0) > 0),
                  ["Tide (All applied cases)", "Tide OB with PP", "Tide OB with PP + 5K QR Load + 4 Txns"]
                )}
                sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={conversionByMonthData} margin={{ top: 20, right: 50, left: 10, bottom: 10 }}>
                <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke={ct.text} tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis yAxisId="left" stroke={ct.text} allowDecimals={false}
                  label={{ value: "Count", angle: -90, position: "insideLeft", fill: ct.text, fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" unit="%" domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "Conv. Rate %", angle: 90, position: "insideRight", fill: "#10b981", fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val, name, props) => {
                    if (name === "Conversion Rate %") return [`${val}%`, name];
                    if (name === "Onboarded") return [val, `Onboarded (${props.payload.onboardCol})`];
                    return [val, name];
                  }}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend verticalAlign="top" />
                <Bar yAxisId="left" dataKey="applied" name="All Applied Cases" fill="#7c3aed" radius={[4, 4, 0, 0]}
                  label={{ position: "top", fontSize: 11, fill: ct.text, formatter: (v) => v > 0 ? v : "" }} />
                <Bar yAxisId="left" dataKey="obWithPP" name="Onboarded" fill="#10b981" radius={[4, 4, 0, 0]}
                  label={{ position: "top", fontSize: 11, fill: ct.text, formatter: (v) => v > 0 ? v : "" }} />
                <Bar yAxisId="left" dataKey="pending" name="Pending (Not Onboarded)" fill="#ef444466" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="rate" name="Conversion Rate %"
                  stroke="#10b981" strokeWidth={3}
                  dot={{ r: 7, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  label={{ position: "top", fontSize: 13, fontWeight: 700, fill: "#10b981", formatter: (v) => `${v}%` }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
        )}

        {/* ── Points Analysis Charts ──────────────────────────────────────── */}
        {pointsBreakdownData.length > 0 && <>
        <ChartCard
            title="Points Contribution by Product"
            subtitle="Which product drives the most points — based on the exact points formula"
          >
            <Box sx={{ position: "relative" }}>
              {/* Total pts — top-left corner */}
              <Box sx={{ position: "absolute", top: 4, left: 4, zIndex: 2, lineHeight: 1.2 }}>
                <Typography variant="caption" sx={{ color: ct.text, opacity: 0.55, display: "block", fontSize: 11 }}>Total Pts</Typography>
                <Typography variant="h6" sx={{ color: ct.text, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
                  {pointsBreakdownData.reduce((s, d) => s + d.points, 0)}
                </Typography>
              </Box>
              <MuiTooltip title="View breakdown table">
                <IconButton size="small"
                  onClick={() => openDrill("Points Breakdown — All Employees",
                    rows.filter((r) => POINTS_FORMULA.some(({ col }) => (Number(r[col]) || 0) > 0))
                        .sort((a, b) => (Number(b["Total_Points"]) || 0) - (Number(a["Total_Points"]) || 0)),
                    POINTS_FORMULA.map(({ col }) => col).filter((c) => rows.some((r) => (Number(r[c]) || 0) > 0))
                  )}
                  sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}>
                  <TableChartIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={420}>
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={pointsBreakdownData}
                    dataKey="points"
                    nameKey="label"
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={145}
                    paddingAngle={3}
                    label={({ pct }) => `${pct}%`}
                    labelLine={{ stroke: ct.text, strokeWidth: 1 }}
                    onClick={(entry) => {
                      if (entry?.col) openDrill(`${entry.label} — Employee Breakdown`,
                        rows.filter((r) => (Number(r[entry.col]) || 0) > 0)
                            .sort((a, b) => (Number(b[entry.col]) || 0) - (Number(a[entry.col]) || 0)),
                        POINTS_FORMULA.map(({ col }) => col).filter((c) => rows.some((r) => (Number(r[c]) || 0) > 0))
                      );
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {pointsBreakdownData.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke={ct.card} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, name, props) => [
                      `${val} pts (${props.payload.pct}%) · ${props.payload.units} units × ${props.payload.weight}`,
                      name
                    ]}
                  />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    formatter={(value, entry) => (
                      <span style={{ color: ct.text, fontSize: 11 }}>
                        {value}
                        <strong style={{ color: entry.color, marginLeft: 5 }}>{entry.payload.points}pts</strong>
                        <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 3 }}>({entry.payload.pct}%)</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </ChartCard>

        <ChartCard
            title="Top Employees by Total Points"
            subtitle="Ranked by Total_Points score for the selected month — click a bar to drill down"
          >
            <Box sx={{ position: "relative" }}>
              <MuiTooltip title="View full table">
                <IconButton size="small"
                  onClick={() => openDrill("Top Employees — Points Breakdown",
                    rows.filter((r) => (Number(r["Total_Points"]) || 0) > 0)
                        .sort((a, b) => (Number(b["Total_Points"]) || 0) - (Number(a["Total_Points"]) || 0)),
                    POINTS_FORMULA.map(({ col }) => col).filter((c) => rows.some((r) => (Number(r[c]) || 0) > 0))
                  )}
                  sx={{ position: "absolute", top: -8, right: 0, zIndex: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}>
                  <TableChartIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={420}>
                <BarChart
                  layout="vertical"
                  data={[...rows]
                    .filter((r) => (Number(r["Total_Points"]) || 0) > 0)
                    .sort((a, b) => (Number(b["Total_Points"]) || 0) - (Number(a["Total_Points"]) || 0))
                    .slice(0, 15)
                    .map((r) => ({ name: r["Name"] || "Unknown", tl: r["TL"] || "", pts: Math.round((Number(r["Total_Points"]) || 0) * 10) / 10 }))}
                  margin={{ left: 10, right: 40, top: 10, bottom: 10 }}
                  onClick={(e) => {
                    if (!e?.activePayload) return;
                    const name = e.activePayload[0]?.payload?.name;
                    openDrill(`${name} — Points Breakdown`,
                      rows.filter((r) => r["Name"] === name),
                      POINTS_FORMULA.map(({ col }) => col).filter((c) => rows.some((r) => r["Name"] === name && (Number(r[c]) || 0) > 0))
                    );
                  }}
                >
                  <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke={ct.text} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke={ct.text} width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, _, props) => [`${val} pts (TL: ${props.payload.tl})`, "Total Points"]}
                  />
                  <Bar dataKey="pts" name="Total Points" radius={[0, 6, 6, 0]} style={{ cursor: "pointer" }}>
                    {[...Array(15)].map((_, i) => (
                      <Cell key={i} fill={`hsl(${260 - i * 8}, 70%, ${58 - i * 1.5}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </ChartCard>
        </>}

      </Box>

      {/* Meeting Trend — same as Overview page, filtered by current month/filters */}
      <Box sx={{ mt: 3 }}>
        <MeetingTrend data={rows} theme={ct} />
      </Box>

      <TideDrillTable
        open={drill.open}
        onClose={closeDrill}
        title={drill.title}
        rows={drill.rows}
        editableCols={drill.editableCols}
        dynamicCols={tideColumns}
      />

      {/* Employee Profile Dialog — opens on bar click in custom chart */}
      {empProfile && (
        <Dialog open={!!empProfile} onClose={() => setEmpProfile(null)} maxWidth="sm" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
          {/* Header */}
          <Box sx={{ background: "linear-gradient(135deg,#7c3aedcc,#7c3aed66)", px: 3, py: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>{empProfile.name}</Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>{empProfile.email}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setEmpProfile(null)} sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)" }}>
                <FullscreenExitIcon fontSize="small" />
              </IconButton>
            </Box>
            {/* Meta chips */}
            <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
              {empProfile.tl && (
                <Box sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 5, px: 1.5, py: 0.3, fontSize: 11, fontWeight: 600 }}>
                  TL: {empProfile.tl}
                </Box>
              )}
              {empProfile.status && (
                <Box sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 5, px: 1.5, py: 0.3, fontSize: 11 }}>
                  {empProfile.status}
                </Box>
              )}
              {empProfile.employment && (
                <Box sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 5, px: 1.5, py: 0.3, fontSize: 11 }}>
                  {empProfile.employment}
                </Box>
              )}
              <Box sx={{ bgcolor: "#10b981", color: "#fff", borderRadius: 5, px: 1.5, py: 0.3, fontSize: 11, fontWeight: 700 }}>
                {empProfile.totalPoints} pts
              </Box>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3 }}>
            {empProfile.kpis.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>No product data for this employee.</Typography>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                {empProfile.kpis.map((k) => (
                  <Card key={k.label} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.3, display: "block" }}>
                        {k.label}
                      </Typography>
                      <Typography variant="h6" sx={{ color: k.color, fontWeight: 800, fontSize: "1.4rem", mt: 0.3 }}>
                        {k.value}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
