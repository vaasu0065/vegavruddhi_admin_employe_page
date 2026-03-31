import React, { useMemo, useState } from "react";
import {
  Box, Button, Card, CardContent, FormControl, InputLabel,
  MenuItem, Select, Stack, TextField,
  Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText, Typography
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";

function uniqueValues(data, key) {
  return Array.from(
    new Set((Array.isArray(data) ? data : []).map((r) => r?.[key]).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)));
}

export default function FiltersBar({
  data,
  selectedMonth,
  setSelectedMonth,
  filters,
  setFilters,
  monthOptions: monthOptionsProp
}) {
  const rows = Array.isArray(data) ? data : [];

  // disambiguation dialog state
  const [disambig, setDisambig] = useState(null);

  const monthOptions = monthOptionsProp || [];
  const tlOptions = useMemo(() => uniqueValues(rows, "TL"), [rows]);
  const statusOptions = useMemo(() => uniqueValues(rows, "Employee status"), [rows]);
  const employmentOptions = useMemo(() => uniqueValues(rows, "Employment type"), [rows]);

  // Employee list filtered by selected TL
  const employeeOptions = useMemo(() => {
    const source = filters.tl ? rows.filter((r) => r["TL"] === filters.tl) : rows;
    return uniqueValues(source, "Name");
  }, [rows, filters.tl]);

  // Build lookup: name → array of unique {tl, status, employment, email} combos
  const employeeMeta = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const name = r["Name"];
      if (!name) return;
      if (!map[name]) map[name] = [];
      const tl = r["TL"] || "";
      if (!map[name].find((x) => x.tl === tl)) {
        map[name].push({
          tl,
          status: r["Employee status"] || "",
          employment: r["Employment type"] || "",
          email: r["Email ID"] || "",
        });
      }
    });
    return map;
  }, [rows]);

  const applyEmployee = (name, option) => {
    setFilters((p) => ({
      ...p,
      employee: name,
      tl: option.tl || "",
      status: option.status || "",
      employment: option.employment || "",
    }));
  };

  const handleEmployeeChange = (_, value) => {
    if (!value) {
      setFilters((p) => ({ ...p, employee: "", tl: "", status: "", employment: "" }));
      return;
    }
    const options = employeeMeta[value] || [];
    // If TL was manually pre-selected, match that TL's record — no popup needed
    if (filters.tl) {
      applyEmployee(value, options.find((o) => o.tl === filters.tl) || options[0] || {});
    } else if (options.length > 1) {
      setDisambig({ name: value, options });
    } else {
      applyEmployee(value, options[0] || {});
    }
  };

  const handleTLChange = (_, value) => {
    if (value) {
      setFilters((p) => ({ ...p, tl: value, employee: "" }));
    } else {
      setFilters((p) => ({ ...p, tl: "", employee: "", status: "", employment: "" }));
    }
  };

  const resetAll = () => {
    setSelectedMonth("");
    setFilters({ tl: "", employee: "", status: "", employment: "" });
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            useFlexGap
            flexWrap="wrap"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <MenuItem value="">All Months</MenuItem>
                {monthOptions.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              options={tlOptions}
              value={filters.tl || null}
              onChange={handleTLChange}
              renderInput={(params) => <TextField {...params} label="Team Leader" />}
              sx={{ minWidth: 240, flexGrow: 1 }}
            />

            <Autocomplete
              options={employeeOptions}
              value={filters.employee || null}
              onChange={handleEmployeeChange}
              renderInput={(params) => <TextField {...params} label="Employee" />}
              sx={{ minWidth: 240, flexGrow: 1 }}
            />

            <Autocomplete
              options={statusOptions}
              value={filters.status || null}
              onChange={(_, v) => setFilters((p) => ({ ...p, status: v || "" }))}
              renderInput={(params) => <TextField {...params} label="Status" />}
              sx={{ minWidth: 220, flexGrow: 1 }}
            />

            <Autocomplete
              options={employmentOptions}
              value={filters.employment || null}
              onChange={(_, v) => setFilters((p) => ({ ...p, employment: v || "" }))}
              renderInput={(params) => <TextField {...params} label="Employment type" />}
              sx={{ minWidth: 240, flexGrow: 1 }}
            />

            <Box sx={{ flexGrow: { xs: 0, md: 0 } }} />

            <Button variant="outlined" color="inherit" onClick={resetAll} sx={{ minWidth: 120 }}>
              Reset
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Disambiguation dialog — shown when selected name has multiple TLs */}
      <Dialog open={!!disambig} onClose={() => setDisambig(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Multiple matches for "{disambig?.name}"</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            This name appears under different team leaders. Pick the one you want:
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <List disablePadding>
            {(disambig?.options || []).map((opt, i) => (
              <ListItemButton
                key={i}
                onClick={() => {
                  applyEmployee(disambig.name, opt);
                  setDisambig(null);
                }}
                sx={{ borderRadius: 2, mb: 0.5, border: "1px solid", borderColor: "divider" }}
              >
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 600 }}>TL: {opt.tl || "—"}</Typography>}
                  secondary={
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.3 }}>
                      {opt.email && <Typography variant="caption" color="text.secondary">{opt.email}</Typography>}
                      {opt.status && <Typography variant="caption" sx={{ bgcolor: "action.hover", borderRadius: 1, px: 0.8 }}>{opt.status}</Typography>}
                      {opt.employment && <Typography variant="caption" sx={{ bgcolor: "action.hover", borderRadius: 1, px: 0.8 }}>{opt.employment}</Typography>}
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
