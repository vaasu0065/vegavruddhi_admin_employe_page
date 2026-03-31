import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableHead, TableRow, TableCell,
  TableBody, TextField, Chip, CircularProgress, Typography
} from "@mui/material";
import { updateRow } from "../services/api";

const IDENTITY_COLS = ["Name", "Email ID", "TL", "Employee status", "Offer letter status", "Current month Status"];

const DEFAULT_EDITABLE = [
  "Tide OB", "Tide OB with PP", "Tide Insurance", "Tide MSME",
  "Tide (All applied cases)", "Tide OB(with correct ref. code)",
  "Tide OB (UPI - BC011+QRPPVV01)", "Tide - PPI",
  "Tide - incorrect referral code", "Tide",
  "Tide OB with PP + 5K QR Load + 4 Txns"
];

export default function TideDrillTable({ open, onClose, title, rows, editableCols, extraCols, dynamicCols }) {
  // Priority: explicit editableCols > dynamicCols from parent > DEFAULT_EDITABLE fallback
  const activeCols = editableCols || dynamicCols || DEFAULT_EDITABLE;
  const displayCols = [...IDENTITY_COLS, ...(extraCols || []), ...activeCols];

  // Local copy of rows so we can update values immediately after save
  const [localRows, setLocalRows] = useState([]);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [error, setError] = useState({});

  // Sync local rows whenever the dialog opens with new data
  useEffect(() => {
    if (open) {
      setLocalRows(rows.map((r) => ({ ...r })));
      setEditing({});
      setSaved({});
      setError({});
    }
  }, [open, rows]);

  const key = (i, col) => `${i}_${col}`;

  const handleEdit = (i, col, val) =>
    setEditing((p) => ({ ...p, [key(i, col)]: val }));

  const handleSave = async (i, col, row) => {
    const k = key(i, col);
    const val = editing[k];
    if (val === undefined || val === "") return;
    setSaving((p) => ({ ...p, [k]: true }));
    setError((p) => ({ ...p, [k]: null }));
    try {
      const res = await updateRow(row["Email ID"], col, Number(val));
      if (res.success) {
        // ── Update the local table row immediately ──────────────────────────
        setLocalRows((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], [col]: Number(val) };
          return next;
        });
        setSaved((p) => ({ ...p, [k]: true }));
        setTimeout(() => setSaved((p) => ({ ...p, [k]: false })), 2000);
        setEditing((p) => { const n = { ...p }; delete n[k]; return n; });
      } else {
        setError((p) => ({ ...p, [k]: res.error || "Failed" }));
      }
    } catch (e) {
      setError((p) => ({ ...p, [k]: "Network error" }));
    }
    setSaving((p) => ({ ...p, [k]: false }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ overflowX: "auto" }}>
        {localRows.length === 0 ? (
          <Typography sx={{ p: 2 }}>No records found.</Typography>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                {displayCols.map((c) => (
                  <TableCell key={c} sx={{ fontWeight: 700, whiteSpace: "nowrap", bgcolor: activeCols.includes(c) ? "action.hover" : undefined }}>
                    {c}
                    {activeCols.includes(c) && (
                      <Typography variant="caption" sx={{ display: "block", opacity: 0.5 }}>editable</Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {localRows.map((row, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ color: "text.secondary", fontSize: 12 }}>{i + 1}</TableCell>
                  {displayCols.map((col) => {
                    const k = key(i, col);
                    const isEditable = activeCols.includes(col);
                    const isEditing = editing[k] !== undefined;
                    return (
                      <TableCell key={col} sx={{ whiteSpace: "nowrap" }}>
                        {isEditable ? (
                          isEditing ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={editing[k]}
                                onChange={(e) => handleEdit(i, col, e.target.value)}
                                sx={{ width: 80 }}
                                autoFocus
                              />
                              {saving[k] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Button size="small" variant="contained" onClick={() => handleSave(i, col, row)}>
                                  Save
                                </Button>
                              )}
                              <Button size="small" onClick={() => setEditing((p) => { const n = { ...p }; delete n[k]; return n; })}>
                                ✕
                              </Button>
                              {error[k] && <Typography color="error" variant="caption">{error[k]}</Typography>}
                            </span>
                          ) : (
                            <span
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                              onClick={() => handleEdit(i, col, row[col] ?? 0)}
                            >
                              {saved[k]
                                ? <Chip label="Saved ✓" color="success" size="small" />
                                : <strong>{row[col] ?? 0}</strong>}
                              <span style={{ fontSize: 11, opacity: 0.4 }}>✏️</span>
                            </span>
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
        )}
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 1 }}>
          {localRows.length} record{localRows.length !== 1 ? "s" : ""} · Click any highlighted cell to edit and sync to Google Sheet
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
