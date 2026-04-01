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
import EditIcon           from '@mui/icons-material/Edit';
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

// ── Points calculation (client-side, mirrors backend POINTS_MAP) ─
const POINTS_MAP = { 'Tide': 2, 'MSME': 0.3, 'Tide Insurance': 1, 'Tide Credit Card': 1 };

function calcAutoPoints(forms, verifiedPhones) {
  return forms.reduce((sum, f) => {
    if (verifiedPhones.has(f.customerNumber)) sum += POINTS_MAP[f.formFillingFor] || 0;
    return sum;
  }, 0);
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
function DuplicatePanel({ duplicates, open, onClose, onNotify, notifying, onSettle, settling }) {
  const [tab, setTab]               = useState('active');
  const [settlements, setSettlements] = useState([]);
  const [loadingSett, setLoadingSett] = useState(false);
  const [settleNote, setSettleNote]   = useState({});

  const loadSettlements = useCallback(async () => {
    setLoadingSett(true);
    try {
      const res  = await fetch(`${EMP_API}/forms/admin/settlements`);
      setSettlements(res.ok ? await res.json() : []);
    } catch { /* ignore */ } finally { setLoadingSett(false); }
  }, []);

  useEffect(() => { if (open && tab === 'settled') loadSettlements(); }, [open, tab, loadSettlements]);
  // Reload settlements after a new settle action
  useEffect(() => { if (open && settling === null && tab === 'settled') loadSettlements(); }, [settling]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c62828', fontWeight: 800, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Cross-Employee Duplicate Merchants
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 40,
          '& .MuiTab-root': { fontWeight: 700, fontSize: 12, minHeight: 40 },
          '& .MuiTabs-indicator': { bgcolor: BRAND.primary } }}>
          <Tab value="active"  label={`Active (${duplicates.filter(d => !d.settled).length}) · Settled (${duplicates.filter(d => d.settled).length})`} />
          <Tab value="settled" label="Settled History" onClick={loadSettlements} />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 2 }}>
        {/* ── Active duplicates ── */}
        {tab === 'active' && (
          duplicates.length === 0
            ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No active cross-employee duplicates.</Typography>
            : duplicates.map((dup, i) => (
              <Card key={i} sx={{ mb: 2, border: `1.5px solid ${dup.settled ? '#a5d6a7' : '#ffcdd2'}`, borderRadius: 2,
                bgcolor: dup.settled ? '#f9fffe' : 'background.paper' }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  {/* Header row */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {dup.settled
                        ? <Chip label="✓ Settled" size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700 }} />
                        : <WarningAmberIcon sx={{ color: '#c62828', fontSize: 18 }} />
                      }
                      <Typography fontWeight={800} sx={{ color: dup.settled ? '#2e7d32' : '#c62828' }}>
                        {dup.customerNames[0] || dup._id.customerNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">({dup._id.customerNumber})</Typography>
                      <ProductChip product={dup._id.formFillingFor} />
                      <Chip label={`${dup.count} submissions`} size="small" sx={{ bgcolor: '#fdecea', color: '#c62828', fontWeight: 700 }} />
                    </Box>
                    {/* Action buttons — hide if already settled */}
                    {!dup.settled && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Tooltip title="Send duplicate alert notification to both employees">
                          <Button size="small" variant="outlined"
                            disabled={notifying === i}
                            startIcon={notifying === i ? <CircularProgress size={12} /> : <NotificationsIcon />}
                            onClick={() => onNotify(dup, i)}
                            sx={{ color: '#c62828', borderColor: '#c62828', fontWeight: 700, fontSize: 11,
                              '&:hover': { bgcolor: '#fdecea' } }}>
                            {notifying === i ? 'Notifying…' : 'Notify'}
                          </Button>
                        </Tooltip>
                        <Tooltip title="Mark this duplicate as settled — record is kept for history">
                          <Button size="small" variant="contained"
                            disabled={settling === i}
                            startIcon={settling === i ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : null}
                            onClick={() => onSettle(dup, i, settleNote[i] || '')}
                            sx={{ bgcolor: BRAND.primary, fontWeight: 700, fontSize: 11,
                              '&:hover': { bgcolor: '#0f3320' } }}>
                            {settling === i ? 'Settling…' : '✓ Mark Settled'}
                          </Button>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Customer names used: {dup.customerNames.join(', ')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: dup.settled ? 0 : 1.5 }}>
                    {dup.employees.map((emp, j) => (
                      <Chip key={j} avatar={<Avatar sx={{ bgcolor: dup.settled ? '#888' : BRAND.primary, fontSize: 11 }}>{initials(emp)}</Avatar>}
                        label={emp} size="small" sx={{ fontWeight: 600 }} />
                    ))}
                  </Box>
                  {/* Settlement info */}
                  {dup.settled && dup.settlementInfo && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Settled on {new Date(dup.settlementInfo.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {dup.settlementInfo.note ? ` · ${dup.settlementInfo.note}` : ''}
                    </Typography>
                  )}
                  {/* Note field — only for unsettled */}
                  {!dup.settled && (
                    <TextField size="small" fullWidth placeholder="Add settlement note (optional)…"
                      value={settleNote[i] || ''}
                      onChange={e => setSettleNote(prev => ({ ...prev, [i]: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                  )}
                </CardContent>
              </Card>
            ))
        )}

        {/* ── Settled history ── */}
        {tab === 'settled' && (
          loadingSett
            ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} sx={{ color: BRAND.primary }} /></Box>
            : settlements.length === 0
              ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No settled duplicates yet.</Typography>
              : settlements.map((s, i) => (
                <Card key={i} sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Chip label="✓ Settled" size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700 }} />
                      <Typography fontWeight={700} sx={{ color: 'text.primary' }}>{s.customerName || s.customerNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">({s.customerNumber})</Typography>
                      <ProductChip product={s.product} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      {(s.employees || []).map((emp, j) => (
                        <Chip key={j} avatar={<Avatar sx={{ bgcolor: '#888', fontSize: 11 }}>{initials(emp)}</Avatar>}
                          label={emp} size="small" sx={{ fontWeight: 600 }} />
                      ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Settled on {new Date(s.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {s.note ? ` · Note: ${s.note}` : ''}
                    </Typography>
                  </CardContent>
                </Card>
              ))
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: BRAND.primary, fontWeight: 700 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Verification status chip ──────────────────────────────────
function VerifyChip({ status }) {
  const map = {
    'Fully Verified': { bg: '#e6f4ea', color: '#2e7d32', icon: '✓' },
    'Partially Done': { bg: '#fff8e1', color: '#f57f17', icon: '◑' },
    'Not Verified':   { bg: '#fdecea', color: '#c62828', icon: '✗' },
    'Not Found':      { bg: '#f5f5f5', color: '#888',    icon: '–' },
  };
  const s = map[status] || map['Not Found'];
  return (
    <Chip label={`${s.icon} ${status || 'Not Found'}`} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, border: `1px solid ${s.color}30` }} />
  );
}

// ── Employee Group Row ────────────────────────────────────────
function EmployeeGroup({ empName, forms, duplicatePhones, empPointsData, onEditPoints }) {
  const [expanded,   setExpanded]   = useState(false);
  const [verifyMap,  setVerifyMap]  = useState({});
  const [verifying,  setVerifying]  = useState(false);
  const dupCount = forms.filter(f => duplicatePhones.has(f.customerNumber)).length;

  // Fetch verification status when expanded
  const fetchVerification = useCallback(async () => {
    if (verifying || Object.keys(verifyMap).length > 0) return;
    setVerifying(true);
    try {
      const phones   = forms.map(f => f.customerNumber).join(',');
      const names    = forms.map(f => encodeURIComponent(f.customerName)).join(',');
      const products = forms.map(f => encodeURIComponent(f.formFillingFor || '')).join(',');
      const res = await fetch(
        `${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}`
      );
      if (res.ok) setVerifyMap(await res.json());
    } catch { /* ignore */ } finally { setVerifying(false); }
  }, [forms, verifyMap, verifying]);

  // Admin can't know verification status — show only adjustment + note
  const adjustment  = empPointsData?.pointsAdjustment || 0;
  const verified    = empPointsData?.verifiedPoints    || 0;
  const totalPoints = Math.round((verified + adjustment) * 10) / 10;

  return (
    <Card sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>
      <Box
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          if (next) fetchVerification();
        }}
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
          {/* Points badge */}
          <Tooltip title={`Verified: ${verified} pts + Adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment} = ${totalPoints} pts`}>
            <Chip
              label={`⭐ ${totalPoints} pts`}
              size="small"
              onClick={e => { e.stopPropagation(); onEditPoints(empName, empPointsData, verified); }}
              sx={{ bgcolor: '#fff8e1', color: '#e76f51', fontWeight: 800, fontSize: 11,
                border: '1.5px solid #f4a261', cursor: 'pointer',
                '&:hover': { bgcolor: '#ffe0b2' } }}
            />
          </Tooltip>
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
                <TableCell>Verification</TableCell>
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
                      {verifying
                        ? <CircularProgress size={12} sx={{ color: BRAND.primary }} />
                        : <VerifyChip status={verifyMap[f.customerNumber]?.status} />
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
  const [settledOpen,setSettledOpen]= useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [notifying,  setNotifying]  = useState(null); // index of dup being notified
  const [notifySnack, setNotifySnack] = useState('');
  const [settling,   setSettling]   = useState(null); // index of dup being settled
  const [empPoints,  setEmpPoints]  = useState([]);   // [{_id, newJoinerName, pointsAdjustment}]
  const [editPtsOpen,  setEditPtsOpen]  = useState(false);
  const [editPtsEmp,   setEditPtsEmp]   = useState(null); // {empName, empData, autoPoints}
  const [editPtsValue, setEditPtsValue] = useState('');
  const [editPtsSaving,setEditPtsSaving]= useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [formsRes, dupRes, ptsRes] = await Promise.all([
        fetch(`${EMP_API}/forms/admin/all`),
        fetch(`${EMP_API}/forms/admin/duplicates`),
        fetch(`${EMP_API}/forms/admin/employee-points`),
      ]);
      if (!formsRes.ok) throw new Error('Failed to load merchant forms');
      setForms(await formsRes.json());
      setDuplicates(dupRes.ok ? await dupRes.json() : []);
      setEmpPoints(ptsRes.ok ? await ptsRes.json() : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSettle = useCallback(async (dup, idx, note) => {    setSettling(idx);
    try {
      const res = await fetch(`${EMP_API}/forms/admin/settle-duplicate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerNumber: dup._id.customerNumber,
          customerName:   dup.customerNames[0] || '',
          product:        dup._id.formFillingFor,
          employees:      dup.employees,
          note:           note || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifySnack('✓ Duplicate marked as settled. Record saved to history.');
        load(); // refresh to remove from active list
      } else {
        setNotifySnack(`Error: ${data.message}`);
      }
    } catch {
      setNotifySnack('Failed to settle. Please try again.');
    } finally {
      setSettling(null);
    }
  }, []);

  const handleEditPoints = useCallback((empName, empData, autoPoints) => {
    setEditPtsEmp({ empName, empData, autoPoints });
    setEditPtsValue(empData?.pointsAdjustment !== undefined ? String(empData.pointsAdjustment) : '0');
    setEditPtsOpen(true);
  }, []);

  const handleSavePoints = useCallback(async () => {
    if (!editPtsEmp?.empData?._id) return;
    setEditPtsSaving(true);
    try {
      // Calculate the delta: newAdjustment - currentAdjustment
      const newAdj     = parseFloat(editPtsValue) || 0;
      const currentAdj = editPtsEmp.empData.pointsAdjustment || 0;
      const delta      = newAdj - currentAdj;
      const res = await fetch(`${EMP_API}/forms/admin/adjust-points/${editPtsEmp.empData._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ adjustment: delta }),
      });
      if (res.ok) {
        setNotifySnack(`✓ Points updated for ${editPtsEmp.empName}`);
        setEditPtsOpen(false);
        load();
      } else {
        const d = await res.json();
        setNotifySnack(`Error: ${d.message}`);
      }
    } catch {
      setNotifySnack('Failed to update points.');
    } finally {
      setEditPtsSaving(false);
    }
  }, [editPtsEmp, editPtsValue, load]);

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
  const settledCount  = duplicates.filter(d => d.settled).length;
  const activeCount   = totalDupCount - settledCount;

  // Map empName → points data
  const empPointsMap = useMemo(() => {
    const m = {};
    empPoints.forEach(e => { m[e.newJoinerName] = e; });
    return m;
  }, [empPoints]);

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
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Total Submissions', value: forms.length,   color: BRAND.primary, bg: '#e6f4ea', key: 'total' },
          { label: 'Employees',         value: grouped.length, color: '#1565c0',     bg: '#e3f2fd', key: 'emp' },
          { label: 'Cross Duplicates',  value: activeCount,    color: '#c62828',     bg: '#fdecea', key: 'dup' },
          { label: 'Settled Duplicates',value: settledCount,   color: '#2e7d32',     bg: '#e6f4ea', key: 'settled' },
        ].map(k => (
          <Card key={k.label}
            onClick={
              k.key === 'dup'     && activeCount   > 0 ? () => setDupOpen(true)     :
              k.key === 'settled' && settledCount  > 0 ? () => setSettledOpen(true) :
              undefined
            }
            sx={{
              borderRadius: 3,
              border: `1.5px solid ${k.color}20`,
              cursor: (k.key === 'dup' && activeCount > 0) || (k.key === 'settled' && settledCount > 0) ? 'pointer' : 'default',
              transition: 'box-shadow 0.2s, transform 0.15s',
              ...((k.key === 'dup' && activeCount > 0) && { '&:hover': { boxShadow: '0 4px 20px rgba(198,40,40,0.18)', transform: 'translateY(-2px)' } }),
              ...((k.key === 'settled' && settledCount > 0) && { '&:hover': { boxShadow: '0 4px 20px rgba(46,125,50,0.18)', transform: 'translateY(-2px)' } }),
            }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {k.label}
                {((k.key === 'dup' && activeCount > 0) || (k.key === 'settled' && settledCount > 0)) && (
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: k.color, fontWeight: 700 }}>
                    (click to view)
                  </Typography>
                )}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Duplicate warning banner */}
      {activeCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}
          action={<Button size="small" color="inherit" fontWeight={700} onClick={() => setDupOpen(true)}>View All</Button>}>
          <strong>{activeCount} cross-employee duplicate merchant(s) detected.</strong> Same merchant submitted by multiple employees.
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
          <EmployeeGroup key={empName} empName={empName} forms={empForms}
            duplicatePhones={duplicatePhones}
            empPointsData={empPointsMap[empName]}
            onEditPoints={handleEditPoints} />
        ))
      )}

      <DuplicatePanel duplicates={duplicates} open={dupOpen} onClose={() => setDupOpen(false)}
        onNotify={handleNotify} notifying={notifying}
        onSettle={handleSettle} settling={settling} />

      {/* Edit Points Dialog */}
      <Dialog open={editPtsOpen} onClose={() => setEditPtsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: BRAND.primary, pb: 1 }}>
          ⭐ Edit Points — {editPtsEmp?.empName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fff8e1', borderRadius: 2, border: '1px solid #f4a261' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Points criteria (Fully Verified only):</Typography>
            {Object.entries(POINTS_MAP).map(([k, v]) => (
              <Typography key={k} variant="caption" sx={{ display: 'block', color: '#e76f51', fontWeight: 600 }}>
                {k}: {v} pts
              </Typography>
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Verified points (from employee dashboard, Fully Verified only): <strong style={{ color: '#e76f51' }}>{editPtsEmp?.autoPoints || 0}</strong>
          </Typography>
          <TextField fullWidth size="small" type="number" label="Manual Adjustment (+ or -)"
            value={editPtsValue}
            onChange={e => setEditPtsValue(e.target.value)}
            helperText="Added on top of verified points. Use negative to subtract."
            inputProps={{ step: 0.1 }} />
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#e6f4ea', borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.primary }}>
              Total: {editPtsEmp?.autoPoints || 0} + ({parseFloat(editPtsValue) >= 0 ? '+' : ''}{parseFloat(editPtsValue) || 0}) = {Math.round(((editPtsEmp?.autoPoints || 0) + (parseFloat(editPtsValue) || 0)) * 10) / 10} pts
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditPtsOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSavePoints} disabled={editPtsSaving}
            sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}>
            {editPtsSaving ? 'Saving…' : 'Save Points'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settled Duplicates Dialog */}
      <Dialog open={settledOpen} onClose={() => setSettledOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: BRAND.primary, fontWeight: 800 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ✓ Settled Duplicate Records ({settledCount})
          </Box>
          <IconButton onClick={() => setSettledOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {duplicates.filter(d => d.settled).length === 0
            ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No settled duplicates yet.</Typography>
            : duplicates.filter(d => d.settled).map((dup, i) => (
              <Card key={i} sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label="✓ Settled" size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700 }} />
                    <Typography fontWeight={800} sx={{ color: BRAND.primary }}>{dup.customerNames[0] || dup._id.customerNumber}</Typography>
                    <Typography variant="caption" color="text.secondary">({dup._id.customerNumber})</Typography>
                    <ProductChip product={dup._id.formFillingFor} />
                    <Chip label={`${dup.count} submissions`} size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700 }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    {dup.employees.map((emp, j) => (
                      <Chip key={j} avatar={<Avatar sx={{ bgcolor: '#888', fontSize: 11 }}>{initials(emp)}</Avatar>}
                        label={emp} size="small" sx={{ fontWeight: 600 }} />
                    ))}
                  </Box>
                  {dup.settlementInfo && (
                    <Box sx={{ bgcolor: '#f9fffe', borderRadius: 1.5, p: 1.5, border: '1px solid #c8e6c9' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Settled on {new Date(dup.settlementInfo.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      {dup.settlementInfo.note && (
                        <Typography variant="caption" sx={{ color: BRAND.primary, fontWeight: 600, display: 'block', mt: 0.5 }}>
                          Note: {dup.settlementInfo.note}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettledOpen(false)} sx={{ color: BRAND.primary, fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

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
