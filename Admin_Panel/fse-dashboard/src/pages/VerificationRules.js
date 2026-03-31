import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Card, CardContent, Button, IconButton,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Chip, CircularProgress, Alert, Snackbar, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Switch, FormControlLabel,
} from "@mui/material";
import AddIcon        from "@mui/icons-material/Add";
import DeleteIcon     from "@mui/icons-material/Delete";
import EditIcon       from "@mui/icons-material/Edit";
import SaveIcon       from "@mui/icons-material/Save";
import RefreshIcon    from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon     from "@mui/icons-material/Cancel";
import { BRAND }      from "../theme";

const EMPLOYEE_API = process.env.REACT_APP_EMPLOYEE_API_URL || "http://localhost:4000/api";

const OPERATORS = [
  { value: "equals",     label: "Equals (one or more values)" },
  { value: "in",         label: "Is one of (OR)" },
  { value: "not_equals", label: "Not Equals" },
  { value: "gte",        label: "≥ (Greater or Equal)" },
  { value: "lte",        label: "≤ (Less or Equal)" },
  { value: "contains",   label: "Contains" },
  { value: "exists",     label: "Exists (not empty)" },
];

// ── Condition Row — loads real columns from collection ─────────
function ConditionRow({ cond, index, onChange, onDelete, disabled, collectionColumns }) {
  const fieldOptions = collectionColumns && collectionColumns.length > 0
    ? collectionColumns
    : ["UPI_Active", "Stage-3", "Pass_Live", "QR_Load_Amount"];

  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 1.5 }}>
      <Chip label={`#${index + 1}`} size="small" sx={{ bgcolor: BRAND.primaryLight, color: BRAND.primary, fontWeight: 700, minWidth: 36 }} />

      {/* Field — populated from real collection columns */}
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel>Field</InputLabel>
        <Select value={cond.field} label="Field" disabled={disabled}
          onChange={e => onChange(index, "field", e.target.value)}>
          {fieldOptions.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
          <MenuItem value="__custom__"><em>Custom…</em></MenuItem>
        </Select>
      </FormControl>

      {cond.field === "__custom__" && (
        <TextField size="small" label="Custom field name" disabled={disabled}
          value={cond._customField || ""}
          onChange={e => onChange(index, "_customField", e.target.value)}
          sx={{ minWidth: 160 }} />
      )}

      {/* Operator */}
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Operator</InputLabel>
        <Select value={cond.operator} label="Operator" disabled={disabled}
          onChange={e => onChange(index, "operator", e.target.value)}>
          {OPERATORS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>

      {/* Value — hidden for "exists" */}
      {cond.operator !== "exists" && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 200 }}>
          {/* Show multi-value inputs for equals/in */}
          {(cond.operator === "equals" || cond.operator === "in") ? (
            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                {(cond.values && cond.values.length > 0 ? cond.values : [cond.value || '']).map((v, vi) => (
                  <Box key={vi} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField size="small" label={vi === 0 ? "Value" : "OR value"} disabled={disabled}
                      value={v}
                      onChange={e => {
                        const newVals = [...(cond.values && cond.values.length > 0 ? cond.values : [cond.value || ''])];
                        newVals[vi] = e.target.value;
                        onChange(index, "values", newVals);
                        if (vi === 0) onChange(index, "value", e.target.value);
                      }}
                      sx={{ width: 120 }} />
                    {vi > 0 && !disabled && (
                      <IconButton size="small" onClick={() => {
                        const newVals = (cond.values || []).filter((_, i) => i !== vi);
                        onChange(index, "values", newVals);
                      }}>
                        <DeleteIcon fontSize="small" sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
              {!disabled && (
                <Button size="small" onClick={() => {
                  const current = cond.values && cond.values.length > 0 ? cond.values : [cond.value || ''];
                  onChange(index, "values", [...current, '']);
                }}
                sx={{ fontSize: 11, color: BRAND.primary, p: 0, minWidth: 0 }}>
                  + Add OR value
                </Button>
              )}
            </Box>
          ) : (
            <TextField size="small" label="Value" disabled={disabled}
              value={cond.value}
              onChange={e => onChange(index, "value", e.target.value)}
              sx={{ minWidth: 100 }} />
          )}
        </Box>
      )}

      {/* Label */}
      <TextField size="small" label="Display Label" disabled={disabled}
        value={cond.label}
        onChange={e => onChange(index, "label", e.target.value)}
        sx={{ minWidth: 180 }} />

      <Tooltip title="Remove condition">
        <span>
          <IconButton size="small" color="error" disabled={disabled} onClick={() => onDelete(index)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

// ── Rule Card ──────────────────────────────────────────────────
function RuleCard({ rule, token, onSaved }) {
  const [editing,    setEditing]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [conditions, setConditions] = useState(rule.conditions || []);
  const [active,     setActive]     = useState(rule.active);
  const [snack,      setSnack]      = useState({ open: false, msg: "", sev: "success" });
  const [collectionColumns, setCollectionColumns] = useState([]);

  // Load real column names from the collection when editing starts
  const loadColumns = async () => {
    if (collectionColumns.length > 0) return; // already loaded
    try {
      const res  = await fetch(`${EMPLOYEE_API}/verify/collection-columns/${rule.collectionName}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const cols = await res.json();
        setCollectionColumns(cols);
      }
    } catch { /* ignore */ }
  };

  const handleCondChange = (i, key, val) => {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  };

  const handleAddCond = () => {
    setConditions(prev => [...prev, { field: "UPI_Active", operator: "equals", value: "Yes", label: "" }]);
  };

  const handleDeleteCond = (i) => {
    setConditions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Resolve custom fields and normalize values
      const resolved = conditions.map(c => {
        const field = c.field === "__custom__" ? (c._customField || "") : c.field;
        // For equals/in with multiple values, keep values array
        const values = (c.values && c.values.filter(v => v && v.trim()).length > 0)
          ? c.values.filter(v => v && v.trim())
          : [];
        return { ...c, field, values, value: values.length > 0 ? values[0] : c.value };
      });

      const res = await fetch(`${EMPLOYEE_API}/verify/rules/${rule._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ conditions: resolved, active }),
      });

      if (!res.ok) throw new Error(await res.text());
      setSnack({ open: true, msg: "Rules saved successfully!", sev: "success" });
      setEditing(false);
      onSaved();
    } catch (err) {
      setSnack({ open: true, msg: "Save failed: " + err.message, sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setConditions(rule.conditions || []);
    setActive(rule.active);
    setEditing(false);
  };

  return (
    <Card sx={{ mb: 3, border: `1.5px solid ${active ? BRAND.primaryLight : "#e0e0e0"}`, borderRadius: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.primary }}>
              {rule.monthLabel}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
              Collection: {rule.collectionName}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FormControlLabel
              control={
                <Switch checked={active} disabled={!editing}
                  onChange={e => setActive(e.target.checked)}
                  sx={{ "& .MuiSwitch-thumb": { bgcolor: active ? BRAND.primary : "#ccc" } }} />
              }
              label={<Typography variant="caption" fontWeight={700}>{active ? "Active" : "Inactive"}</Typography>}
            />
            {!editing ? (
              <Button startIcon={<EditIcon />} variant="outlined" size="small"
                onClick={() => { setEditing(true); loadColumns(); }}
                sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}>
                Edit Rules
              </Button>
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button startIcon={<CancelIcon />} variant="outlined" size="small" color="inherit"
                  onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
                  variant="contained" size="small" onClick={handleSave} disabled={saving}
                  sx={{ bgcolor: BRAND.primary, "&:hover": { bgcolor: BRAND.primaryMid }, fontWeight: 700 }}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Conditions */}
        <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1.2 }}>
          Verification Conditions ({conditions.length})
        </Typography>

        <Box sx={{ mt: 1.5 }}>
          {conditions.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", mb: 1 }}>
              No conditions set — all merchants will show "Not Verified"
            </Typography>
          )}
          {conditions.map((cond, i) => (
            <ConditionRow key={i} cond={cond} index={i}
              onChange={handleCondChange} onDelete={handleDeleteCond}
              disabled={!editing} collectionColumns={collectionColumns} />
          ))}
        </Box>

        {editing && (
          <Button startIcon={<AddIcon />} size="small" variant="dashed"
            onClick={handleAddCond}
            sx={{
              mt: 1, borderStyle: "dashed", border: `1.5px dashed ${BRAND.primary}`,
              color: BRAND.primary, fontWeight: 700, borderRadius: 2,
              "&:hover": { bgcolor: BRAND.primaryLight },
            }}>
            Add Condition
          </Button>
        )}

        {/* Preview of current conditions */}
        {!editing && conditions.length > 0 && (
          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {conditions.map((c, i) => (
              <Chip key={i} size="small"
                icon={<CheckCircleIcon sx={{ fontSize: 14, color: BRAND.primary + " !important" }} />}
                label={c.label || (c.field + ' ' + c.operator + ' ' + (c.values && c.values.length > 1 ? c.values.join(' OR ') : c.value))}
                sx={{ bgcolor: BRAND.primaryLight, color: BRAND.primary, fontWeight: 600, fontSize: 11 }} />
            ))}
          </Box>
        )}
      </CardContent>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Card>
  );
}

// ── Add New Rule Dialog ────────────────────────────────────────
function AddRuleDialog({ open, onClose, token, onSaved }) {
  const [form, setForm] = useState({ collectionName: "", monthLabel: "" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleAdd = async () => {
    if (!form.collectionName || !form.monthLabel) { setError("Both fields required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${EMPLOYEE_API}/verify/rules/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...form, active: true, conditions: [] }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
      setForm({ collectionName: "", monthLabel: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: BRAND.primary }}>Add New Month Rule</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="Collection Name (MongoDB)" size="small" sx={{ mb: 2, mt: 1 }}
          placeholder="e.g. TL_connect_April"
          value={form.collectionName} onChange={e => setForm(f => ({ ...f, collectionName: e.target.value }))} />
        <TextField fullWidth label="Month Label (display)" size="small"
          placeholder="e.g. April 2026"
          value={form.monthLabel} onChange={e => setForm(f => ({ ...f, monthLabel: e.target.value }))} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={handleAdd} disabled={saving}
          sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}>
          {saving ? "Creating…" : "Create Rule"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function VerificationRules({ token: propToken }) {
  const [rules,   setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [addOpen, setAddOpen] = useState(false);

  // Allow admin to paste a JWT token from the employee app
  const [token, setToken] = useState(propToken || localStorage.getItem("emp_token") || "");
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenForm, setShowTokenForm] = useState(!token);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${EMPLOYEE_API}/verify/rules`);
      if (!res.ok) throw new Error("Failed to load rules — is the employee server running on port 4000?");
      const data = await res.json();
      setRules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}>

      {/* Page Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>
            Merchant Verification Rules
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure conditions per month. These rules determine the verification status shown on each employee's merchant list.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={load} sx={{ border: `1px solid ${BRAND.primaryLight}`, color: BRAND.primary }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setAddOpen(true)}
            sx={{ bgcolor: BRAND.primary, fontWeight: 700, "&:hover": { bgcolor: BRAND.primaryMid } }}>
            Add Month
          </Button>
        </Box>
      </Box>

      {/* Token form — shown when no token */}
      {showTokenForm && (
        <Card sx={{ mb: 3, border: `1.5px solid ${BRAND.accent}`, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              🔑 Employee App Token Required
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This page connects to the Employee App API (port 4000). Log in to the employee app at{" "}
              <a href="http://localhost:4000" target="_blank" rel="noreferrer">localhost:4000</a>,
              then open browser DevTools → Application → Local Storage → copy the <code>token</code> value and paste it below.
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <TextField size="small" label="Paste JWT token here" sx={{ flex: 1, minWidth: 260 }}
                value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                type="password" />
              <Button variant="contained" onClick={() => {
                if (tokenInput) {
                  localStorage.setItem("emp_token", tokenInput);
                  setToken(tokenInput);
                  setShowTokenForm(false);
                }
              }} sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}>
                Connect
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {token && !showTokenForm && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}
          action={<Button size="small" color="inherit" onClick={() => { setToken(""); setShowTokenForm(true); localStorage.removeItem("emp_token"); }}>Disconnect</Button>}>
          Connected to Employee App API
        </Alert>
      )}

      {/* How it works */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <strong>How it works:</strong> Each rule maps to a MongoDB collection (one per month).
        When an employee submits a merchant form, the system looks up the merchant's phone number
        in the sheet data and evaluates all conditions. The result shows as
        <strong> ✓ Fully Verified</strong>, <strong>◑ Partially Done</strong>, or <strong>✗ Not Verified</strong> on their dashboard.
      </Alert>

      {/* Status */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: BRAND.primary }} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={load}>Retry</Button>
        }>{error}</Alert>
      )}

      {/* Rules */}
      {!loading && !error && rules.length === 0 && (
        <Card sx={{ textAlign: "center", py: 6, border: `1.5px dashed ${BRAND.primaryLight}` }}>
          <Typography color="text.secondary">No rules found. Click "Add Month" to create one.</Typography>
        </Card>
      )}

      {!loading && rules.map(rule => (
        <RuleCard key={rule._id} rule={rule} token={token} onSaved={load} />
      ))}

      <AddRuleDialog open={addOpen} onClose={() => setAddOpen(false)} token={token} onSaved={load} />
    </Box>
  );
}
