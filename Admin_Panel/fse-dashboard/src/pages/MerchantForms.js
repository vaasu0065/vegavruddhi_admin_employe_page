import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, CircularProgress,
  Alert, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Tabs, Tab, Badge, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Collapse, Menu, MenuItem, ListItemIcon, ListItemText,
  Snackbar,
} from '@mui/material';
import RefreshIcon        from '@mui/icons-material/Refresh';
import SearchIcon         from '@mui/icons-material/Search';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import NotificationsIcon  from '@mui/icons-material/Notifications';
import ExpandMoreIcon     from '@mui/icons-material/ExpandMore';
import ExpandLessIcon     from '@mui/icons-material/ExpandLess';
import CloseIcon          from '@mui/icons-material/Close';
import DownloadIcon       from '@mui/icons-material/Download';
import TableChartIcon     from '@mui/icons-material/TableChart';
import GridOnIcon         from '@mui/icons-material/GridOn';
import * as XLSX          from 'xlsx';
import { BRAND }          from '../theme';

// ── Flatten a form record into a flat row for export ─────────
function flattenForm(f) {
  return {
    'Employee Name':     f.employeeName   || '',
    'Customer Name':     f.customerName   || '',
    'Customer Phone':    f.customerNumber || '',
    'Location':          f.location       || '',
    'Visit Status':      f.status         || '',
    'Product':           f.formFillingFor || (f.attemptedProducts || []).join(', '),
    'Tide QR Posted':    f.tide_qrPosted    || '',
    'Tide UPI Txn Done': f.tide_upiTxnDone  || '',
    'Kotak Txn Done':    f.kotak_txnDone    || '',
    'Kotak WiFi/BT Off': f.kotak_wifiBtOff  || '',
    'Insurance Vehicle No':   f.ins_vehicleNumber  || '',
    'Insurance Vehicle Type': f.ins_vehicleType    || '',
    'Insurance Type':         f.ins_insuranceType  || '',
    'PineLab Card Txn':       f.pine_cardTxn       || '',
    'PineLab WiFi Connected': f.pine_wifiConnected || '',
    'Credit Card Name':       f.cc_cardName        || '',
    'Tide Insurance Type':    f.tideIns_type        || '',
    'BharatPay Product':      f.bp_product          || '',
    'Submitted On':      f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
  };
}

// ── Export to Excel ───────────────────────────────────────────
function exportToExcel(forms) {
  const rows = forms.map(flattenForm);
  const ws   = XLSX.utils.json_to_sheet(rows);

  // Auto column widths
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length), 10)
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Merchant Forms');
  XLSX.writeFile(wb, `Merchant_Forms_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Export to Google Sheets ───────────────────────────────────
async function exportToGoogleSheets(forms, setExporting, setError) {
  setExporting(true);
  try {
    const rows    = forms.map(flattenForm);
    const headers = Object.keys(rows[0] || {});
    const values  = [headers, ...rows.map(r => headers.map(h => r[h] || ''))];

    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      callback: async (tokenResponse) => {
        try {
          if (tokenResponse.error) {
            setError('Google auth failed: ' + tokenResponse.error);
            setExporting(false);
            return;
          }
          const accessToken = tokenResponse.access_token;

          // Create new spreadsheet
          const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              properties: { title: `Merchant Forms ${new Date().toLocaleDateString('en-IN')}` },
              sheets: [{ properties: { title: 'Merchant Forms' } }]
            })
          });
          const sheet   = await createRes.json();
          const sheetId = sheet.spreadsheetId;
          if (!sheetId) throw new Error('Failed to create spreadsheet');

          // Write data
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1?valueInputOption=RAW`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values })
          });

          // Format: bold header, freeze row, auto-resize
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [
              { repeatCell: {
                  range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                  cell: { userEnteredFormat: {
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    backgroundColor: { red: 0.1, green: 0.27, blue: 0.15 }
                  }},
                  fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }},
              { updateSheetProperties: {
                  properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
                  fields: 'gridProperties.frozenRowCount'
              }},
              { autoResizeDimensions: {
                  dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length }
              }}
            ]})
          });

          window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank');
        } catch (err) {
          setError('Export failed: ' + err.message);
        } finally {
          setExporting(false);
        }
      }
    });

    if (!tokenClient) {
      setError('Google API not loaded yet. Please wait a moment and try again.');
      setExporting(false);
      return;
    }
    tokenClient.requestAccessToken();
  } catch (err) {
    setError('Export failed: ' + err.message);
    setExporting(false);
  }
}

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const PRODUCT_COLORS = {
  'Tide':                { bg: '#e3f2fd', color: '#1565c0' },
  'Kotak 811':           { bg: '#f3e5f5', color: '#6a1b9a' },
  'Insurance':           { bg: '#fff3e0', color: '#e65100' },
  'PineLab':             { bg: '#e8f5e9', color: '#2e7d32' },
  'Credit Card':         { bg: '#fce4ec', color: '#880e4f' },
  'Tide Insurance':      { bg: '#e0f7fa', color: '#006064' },
  'MSME':                { bg: '#f9fbe7', color: '#558b2f' },
  'Airtel Payments Bank':{ bg: '#fbe9e7', color: '#bf360c' },
  'Equitas SF Bank':     { bg: '#ede7f6', color: '#4527a0' },
  'IndusInd Bank':       { bg: '#e8eaf6', color: '#283593' },
  'Bharat Pay':          { bg: '#e0f2f1', color: '#004d40' },
  'Tide Credit Card':    { bg: '#e1f5fe', color: '#01579b' },
};

function ProductChip({ product }) {
  const c = PRODUCT_COLORS[product] || { bg: '#f5f5f5', color: '#555' };
  return (
    <Chip label={product || '–'} size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: 11, border: `1px solid ${c.color}30` }} />
  );
}

function StatusChip({ status }) {
  const map = {
    'Ready for Onboarding':          { bg: '#e6f4ea', color: '#2e7d32' },
    'Not Interested':                { bg: '#fdecea', color: '#c62828' },
    'Try but not done due to error': { bg: '#fff3e0', color: '#e65100' },
    'Need to visit again':           { bg: '#e3f2fd', color: '#1565c0' },
  };
  const s = map[status] || { bg: '#f5f5f5', color: '#555' };
  return (
    <Chip label={status || '–'} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 11, maxWidth: 180 }} />
  );
}

// ── Duplicate Alert Panel ─────────────────────────────────────
function DuplicatePanel({ duplicates, open, onClose, onNotify, notifying }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c62828', fontWeight: 800 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Cross-Employee Duplicate Merchants ({duplicates.length})
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {duplicates.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No cross-employee duplicates found.</Typography>
        ) : duplicates.map((dup, i) => (
          <Card key={i} sx={{ mb: 2, border: '1.5px solid #ffcdd2', borderRadius: 2 }}>
            <CardContent sx={{ pb: '12px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <WarningAmberIcon sx={{ color: '#c62828', fontSize: 18 }} />
                  <Typography fontWeight={800} sx={{ color: '#c62828' }}>
                    {dup.customerNames[0] || dup._id.customerNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">({dup._id.customerNumber})</Typography>
                  <ProductChip product={dup._id.formFillingFor} />
                  <Chip label={`${dup.count} submissions`} size="small" sx={{ bgcolor: '#fdecea', color: '#c62828', fontWeight: 700 }} />
                </Box>
                {/* Notify button */}
                <Tooltip title="Send duplicate alert notification to both employees">
                  <Button
                    size="small"
                    variant="contained"
                    disabled={notifying === i}
                    startIcon={notifying === i ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <NotificationsIcon />}
                    onClick={() => onNotify(dup, i)}
                    sx={{ bgcolor: '#c62828', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: '#b71c1c' } }}
                  >
                    {notifying === i ? 'Notifying…' : 'Notify Employees'}
                  </Button>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Customer names used: {dup.customerNames.join(', ')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {dup.employees.map((emp, j) => (
                  <Chip key={j} avatar={<Avatar sx={{ bgcolor: BRAND.primary, fontSize: 11 }}>{initials(emp)}</Avatar>}
                    label={emp} size="small" sx={{ fontWeight: 600 }} />
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: BRAND.primary, fontWeight: 700 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Employee Group Row ────────────────────────────────────────
function EmployeeGroup({ empName, forms, duplicatePhones }) {
  const [expanded, setExpanded] = useState(false);
  const dupCount = forms.filter(f => duplicatePhones.has(f.customerNumber)).length;

  return (
    <Card sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>
      <Box
        onClick={() => setExpanded(p => !p)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5, cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' }, borderRadius: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: BRAND.primary, width: 34, height: 34, fontSize: 13, fontWeight: 700 }}>
            {initials(empName)}
          </Avatar>
          <Box>
            <Typography fontWeight={700} sx={{ color: 'text.primary' }}>{empName}</Typography>
            <Typography variant="caption" color="text.secondary">{forms.length} merchant{forms.length !== 1 ? 's' : ''}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {dupCount > 0 && (
            <Tooltip title={`${dupCount} merchant(s) also submitted by other employees`}>
              <Chip icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                label={`${dupCount} dup`} size="small"
                sx={{ bgcolor: '#fdecea', color: '#c62828', fontWeight: 700, fontSize: 11 }} />
            </Tooltip>
          )}
          {expanded ? <ExpandLessIcon sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary', borderBottom: '2px solid', borderColor: 'divider', py: 1.5 } }}>
                <TableCell>Customer</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Dup?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {forms.map(f => {
                const isDup = duplicatePhones.has(f.customerNumber);
                return (
                  <TableRow key={f._id} hover
                    sx={{ bgcolor: isDup ? '#fff8f8' : 'transparent', '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>{f.customerName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{f.customerNumber}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{f.location}</Typography></TableCell>
                    <TableCell><StatusChip status={f.status} /></TableCell>
                    <TableCell>
                      {f.formFillingFor
                        ? <ProductChip product={f.formFillingFor} />
                        : <Typography variant="caption" color="text.secondary">{(f.attemptedProducts || []).join(', ') || '–'}</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {isDup && (
                        <Tooltip title="This merchant was also submitted by another employee">
                          <WarningAmberIcon sx={{ color: '#c62828', fontSize: 18 }} />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function MerchantForms() {
  const [forms,      setForms]      = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [dupOpen,    setDupOpen]    = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [notifying,  setNotifying]  = useState(null); // index of dup being notified
  const [notifySnack, setNotifySnack] = useState('');

  const handleNotify = useCallback(async (dup, idx) => {
    setNotifying(idx);
    try {
      const res  = await fetch(`${EMP_API}/requests/notify-duplicate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNames: dup.employees,
          merchantName:  dup.customerNames[0] || '',
          merchantPhone: dup._id.customerNumber,
          product:       dup._id.formFillingFor,
        }),
      });
      const data = await res.json();
      setNotifySnack(res.ok ? `✓ Notified ${data.count} employee(s) about the duplicate.` : `Error: ${data.message}`);
    } catch {
      setNotifySnack('Failed to send notification. Please try again.');
    } finally {
      setNotifying(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [formsRes, dupRes] = await Promise.all([
        fetch(`${EMP_API}/forms/admin/all`),
        fetch(`${EMP_API}/forms/admin/duplicates`),
      ]);
      if (!formsRes.ok) throw new Error('Failed to load merchant forms');
      setForms(await formsRes.json());
      setDuplicates(dupRes.ok ? await dupRes.json() : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Set of phone numbers that are cross-employee duplicates
  const duplicatePhones = useMemo(() => {
    const s = new Set();
    duplicates.forEach(d => s.add(d._id.customerNumber));
    return s;
  }, [duplicates]);

  // Group forms by employee, filtered by search
  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = forms.filter(f =>
      !q ||
      (f.customerName   || '').toLowerCase().includes(q) ||
      (f.customerNumber || '').includes(q) ||
      (f.employeeName   || '').toLowerCase().includes(q) ||
      (f.location       || '').toLowerCase().includes(q)
    );
    const map = {};
    filtered.forEach(f => {
      const key = f.employeeName || 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(f);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [forms, search]);

  const totalDupCount = duplicates.length;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>Merchant Forms</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All merchant submissions by employees — employee-wise view
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Duplicate Bell */}
          <Tooltip title={totalDupCount > 0 ? `${totalDupCount} cross-employee duplicate merchant(s)` : 'No cross-employee duplicates'}>
            <Badge badgeContent={totalDupCount} color="error" max={99}>
              <IconButton onClick={() => setDupOpen(true)}
                sx={{ border: `1.5px solid ${totalDupCount > 0 ? '#c62828' : BRAND.primaryLight}`,
                  color: totalDupCount > 0 ? '#c62828' : BRAND.primary,
                  bgcolor: totalDupCount > 0 ? '#fdecea' : 'transparent',
                  '&:hover': { bgcolor: totalDupCount > 0 ? '#ffcdd2' : BRAND.primaryLight } }}>
                <NotificationsIcon />
              </IconButton>
            </Badge>
          </Tooltip>

          {/* Export Button */}
          <Button
            startIcon={exporting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <DownloadIcon />}
            variant="contained"
            disabled={exporting || forms.length === 0}
            onClick={e => setExportAnchor(e.currentTarget)}
            sx={{ bgcolor: BRAND.primary, fontWeight: 700, '&:hover': { bgcolor: '#0f3320' } }}
          >
            Export
          </Button>
          <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}
            PaperProps={{ sx: { borderRadius: 2, mt: 0.5, minWidth: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } }}>
            <MenuItem onClick={() => { setExportAnchor(null); exportToExcel(forms); }}
              sx={{ gap: 1.5, py: 1.5 }}>
              <ListItemIcon><TableChartIcon sx={{ color: '#217346' }} /></ListItemIcon>
              <ListItemText primary="Export to Excel" secondary=".xlsx file download" />
            </MenuItem>
            <MenuItem onClick={() => { setExportAnchor(null); exportToGoogleSheets(forms, setExporting, setError); }}
              sx={{ gap: 1.5, py: 1.5 }}>
              <ListItemIcon><GridOnIcon sx={{ color: '#0F9D58' }} /></ListItemIcon>
              <ListItemText primary="Export to Google Sheets" secondary="Opens in new tab" />
            </MenuItem>
          </Menu>

          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}
            sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Total Submissions', value: forms.length,   color: BRAND.primary, bg: '#e6f4ea', key: 'total' },
          { label: 'Employees',         value: grouped.length, color: '#1565c0',     bg: '#e3f2fd', key: 'emp' },
          { label: 'Cross Duplicates',  value: totalDupCount,  color: '#c62828',     bg: '#fdecea', key: 'dup' },
        ].map(k => (
          <Card key={k.label}
            onClick={k.key === 'dup' && totalDupCount > 0 ? () => setDupOpen(true) : undefined}
            sx={{
              borderRadius: 3,
              border: `1.5px solid ${k.color}20`,
              cursor: k.key === 'dup' && totalDupCount > 0 ? 'pointer' : 'default',
              transition: 'box-shadow 0.2s, transform 0.15s',
              ...(k.key === 'dup' && totalDupCount > 0 && {
                '&:hover': { boxShadow: '0 4px 20px rgba(198,40,40,0.18)', transform: 'translateY(-2px)' }
              })
            }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {k.label}
                {k.key === 'dup' && totalDupCount > 0 && (
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: '#c62828', fontWeight: 700 }}>
                    (click to view)
                  </Typography>
                )}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Duplicate warning banner */}
      {totalDupCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}
          action={<Button size="small" color="inherit" fontWeight={700} onClick={() => setDupOpen(true)}>View All</Button>}>
          <strong>{totalDupCount} cross-employee duplicate merchant(s) detected.</strong> Same merchant submitted by multiple employees.
        </Alert>
      )}

      {/* Search */}
      <TextField fullWidth size="small" placeholder="Search by merchant name, phone, employee or location…"
        value={search} onChange={e => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }} />

      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BRAND.primary }} />
        </Box>
      ) : grouped.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6, border: `1.5px dashed ${BRAND.primaryLight}` }}>
          <Typography color="text.secondary">No merchant forms found.</Typography>
        </Card>
      ) : (
        grouped.map(([empName, empForms]) => (
          <EmployeeGroup key={empName} empName={empName} forms={empForms} duplicatePhones={duplicatePhones} />
        ))
      )}

      <DuplicatePanel duplicates={duplicates} open={dupOpen} onClose={() => setDupOpen(false)}
        onNotify={handleNotify} notifying={notifying} />

      <Snackbar open={!!notifySnack} autoHideDuration={4000} onClose={() => setNotifySnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notifySnack.startsWith('✓') ? 'success' : 'error'} variant="filled"
          onClose={() => setNotifySnack('')}>
          {notifySnack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
