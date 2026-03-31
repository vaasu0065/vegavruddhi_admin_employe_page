import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip,
  CircularProgress, Alert, Snackbar, Tooltip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Avatar, Tabs, Tab, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import CancelIcon       from '@mui/icons-material/Cancel';
import RefreshIcon      from '@mui/icons-material/Refresh';
import PersonIcon       from '@mui/icons-material/Person';
import EditIcon         from '@mui/icons-material/Edit';
import { BRAND }        from '../theme';

const EMP_API = (process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api') + '/auth';

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusChip({ status }) {
  const map = {
    pending:  { label: 'Pending',  color: '#e65100', bg: '#fff3e0' },
    approved: { label: 'Approved', color: '#2e7d32', bg: '#e6f4ea' },
    rejected: { label: 'Rejected', color: '#c62828', bg: '#fdecea' },
  };
  const s = map[status] || map.pending;
  return (
    <Chip label={s.label} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, border: `1px solid ${s.color}30` }} />
  );
}

function EmployeeRow({ emp, onApprove, onReject, showActions, onEdit }) {
  const [loading, setLoading] = useState(false);

  const handle = async (action) => {
    setLoading(true);
    await action();
    setLoading(false);
  };

  return (
    <TableRow hover sx={{ '&:last-child td': { border: 0 } }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: BRAND.primary, width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
            {initials(emp.newJoinerName)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>{emp.newJoinerName}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{emp.email}</Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell><Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>{emp.position}</Typography></TableCell>
      <TableCell><Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>{emp.location}</Typography></TableCell>
      <TableCell><Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>{emp.reportingManager}</Typography></TableCell>
      <TableCell><Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>{emp.newJoinerPhone}</Typography></TableCell>
      <TableCell>
        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
          {new Date(emp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Typography>
      </TableCell>
      <TableCell><StatusChip status={emp.approvalStatus} /></TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Edit button always visible */}
          <Tooltip title="Edit employee details">
            <Button size="small" variant="outlined" startIcon={<EditIcon />}
              onClick={() => onEdit(emp)}
              sx={{ color: BRAND.primary, borderColor: BRAND.primary, fontWeight: 700, fontSize: 11,
                '&:hover': { bgcolor: BRAND.primaryLight } }}>
              Edit
            </Button>
          </Tooltip>
          {showActions && (
            <>
              <Tooltip title="Approve">
                <span>
                  <Button size="small" variant="contained" disabled={loading}
                    startIcon={loading ? <CircularProgress size={12} /> : <CheckCircleIcon />}
                    onClick={() => handle(onApprove)}
                    sx={{ bgcolor: BRAND.primary, fontWeight: 700, fontSize: 11,
                      '&:hover': { bgcolor: BRAND.primaryMid }, minWidth: 90 }}>
                    Approve
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Reject">
                <span>
                  <Button size="small" variant="outlined" disabled={loading}
                    startIcon={<CancelIcon />}
                    onClick={() => handle(onReject)}
                    sx={{ color: '#c62828', borderColor: '#c62828', fontWeight: 700, fontSize: 11,
                      '&:hover': { bgcolor: '#fdecea', borderColor: '#c62828' }, minWidth: 80 }}>
                    Reject
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}

export default function EmployeeApprovals() {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [tab,       setTab]       = useState('pending');
  const [snack,     setSnack]     = useState({ open: false, msg: '', sev: 'success' });
  const [posRequests,    setPosRequests]    = useState([]);
  const [posReqLoading,  setPosReqLoading]  = useState(false);
  const [changeRequests,     setChangeRequests]     = useState([]);
  const [changeReqLoading,   setChangeReqLoading]   = useState(false);

  // Edit modal state
  const [editOpen,   setEditOpen]   = useState(false);
  const [editEmp,    setEditEmp]    = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${EMP_API}/all-employees`);
      if (!res.ok) throw new Error('Failed to load — is the employee server running on port 3000?');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadPosRequests();
    loadChangeRequests();
    // Poll every 10 seconds for near real-time updates
    const interval = setInterval(() => { load(); loadPosRequests(); loadChangeRequests(); }, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const loadChangeRequests = async () => {
    setChangeReqLoading(true);
    try {
      const res  = await fetch('http://localhost:4000/api/requests/all');
      const data = await res.json();
      setChangeRequests(Array.isArray(data) ? data : []);
    } catch { } finally { setChangeReqLoading(false); }
  };

  const approveChangeReq = async (id) => {
    const res = await fetch(`http://localhost:4000/api/requests/${id}/approve`, { method: 'PUT' });
    if (res.ok) { setSnack({ open: true, msg: 'Request approved and applied!', sev: 'success' }); loadChangeRequests(); load(); }
    else setSnack({ open: true, msg: 'Failed', sev: 'error' });
  };

  const rejectChangeReq = async (id) => {
    const res = await fetch(`http://localhost:4000/api/requests/${id}/reject`, { method: 'PUT' });
    if (res.ok) { setSnack({ open: true, msg: 'Request rejected', sev: 'warning' }); loadChangeRequests(); }
    else setSnack({ open: true, msg: 'Failed', sev: 'error' });
  };

  const loadPosRequests = async () => {
    setPosReqLoading(true);
    try {
      const res  = await fetch(`${EMP_API}/position-requests`);
      const data = await res.json();
      setPosRequests(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally {
      setPosReqLoading(false);
    }
  };

  const approvePosReq = async (id) => {
    const res = await fetch(`${EMP_API}/position-requests/${id}/approve`, { method: 'PUT' });
    if (res.ok) { setSnack({ open: true, msg: 'Position updated!', sev: 'success' }); loadPosRequests(); load(); }
    else setSnack({ open: true, msg: 'Failed', sev: 'error' });
  };

  const rejectPosReq = async (id) => {
    const res = await fetch(`${EMP_API}/position-requests/${id}/reject`, { method: 'PUT' });
    if (res.ok) { setSnack({ open: true, msg: 'Request rejected', sev: 'warning' }); loadPosRequests(); }
    else setSnack({ open: true, msg: 'Failed', sev: 'error' });
  };

  const approve = async (id) => {
    const res = await fetch(`${EMP_API}/approve/${id}`, { method: 'PUT' });
    if (res.ok) {
      setSnack({ open: true, msg: 'Employee approved successfully!', sev: 'success' });
      load();
    } else {
      setSnack({ open: true, msg: 'Approval failed', sev: 'error' });
    }
  };

  const reject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this employee?')) return;
    const res = await fetch(`${EMP_API}/reject/${id}`, { method: 'PUT' });
    if (res.ok) {
      setSnack({ open: true, msg: 'Employee rejected.', sev: 'warning' });
      load();
    } else {
      setSnack({ open: true, msg: 'Rejection failed', sev: 'error' });
    }
  };

  const openEdit = (emp) => {
    setEditEmp(emp);
    setEditForm({
      newJoinerName:    emp.newJoinerName    || '',
      position:         emp.position         || '',
      location:         emp.location         || '',
      reportingManager: emp.reportingManager || '',
      newJoinerPhone:   emp.newJoinerPhone   || '',
      newJoinerEmailId: emp.newJoinerEmailId || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      const res  = await fetch(`${EMP_API.replace('/auth', '')}/auth/admin/update-employee/${editEmp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setSnack({ open: true, msg: 'Employee updated successfully!', sev: 'success' });
        setEditOpen(false);
        load();
      } else {
        const d = await res.json();
        setSnack({ open: true, msg: d.message || 'Update failed', sev: 'error' });
      }
    } catch {
      setSnack({ open: true, msg: 'Server error', sev: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  const pending  = employees.filter(e => e.approvalStatus === 'pending');
  const approved = employees.filter(e => e.approvalStatus === 'approved');
  const rejected = employees.filter(e => e.approvalStatus === 'rejected');

  const tableFor = (list, showActions, title) => (
    <Box>
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: BRAND.primary, letterSpacing: 0.3 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">{list.length} record{list.length !== 1 ? 's' : ''}</Typography>
      </Box>
      {list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
          <PersonIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
          <Typography variant="body2">No records found</Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{
                '& th': {
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: 'text.secondary',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  py: 1.5,
                  bgcolor: 'transparent',
                }
              }}>
                <TableCell>Employee</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Reporting Manager</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Registered On</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map(emp => (
                <EmployeeRow key={emp._id} emp={emp} showActions={showActions}
                  onEdit={openEdit}
                  onApprove={() => approve(emp._id)}
                  onReject={() => reject(emp._id)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>
            Employee Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Review and approve new employee registrations. Auto-refreshes every 30 seconds.
          </Typography>
        </Box>
        <Tooltip title="Refresh now">
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}
            sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}>
            Refresh
          </Button>
        </Tooltip>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Pending Approval', count: pending.length,  color: '#e65100', bg: '#fff3e0' },
          { label: 'Approved',         count: approved.length, color: '#2e7d32', bg: '#e6f4ea' },
          { label: 'Rejected',         count: rejected.length, color: '#c62828', bg: '#fdecea' },
        ].map(s => (
          <Card key={s.label} sx={{ borderRadius: 3, border: `1.5px solid ${s.color}20` }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>{s.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {/* Tabs */}
      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
            px: 2,
            '& .MuiTab-root': { color: 'text.primary', fontWeight: 600, fontSize: '0.82rem' },
            '& .MuiTab-root.Mui-selected': { color: BRAND.primary, fontWeight: 700 },
            '& .MuiTabs-indicator': { backgroundColor: BRAND.primary },
          }}>
            <Tab value="pending" label={
              <Badge badgeContent={pending.length} color="warning" max={99} sx={{ '& .MuiBadge-badge': { right: -8, top: -2 } }}>
                <Box sx={{ pr: 2 }}>Pending</Box>
              </Badge>
            } />
            <Tab value="approved" label={`Approved (${approved.length})`} />
            <Tab value="rejected" label={`Rejected (${rejected.length})`} />
            <Tab value="posreq" label={
              <Badge badgeContent={posRequests.filter(r => r.status === 'pending').length} color="error" max={99} sx={{ '& .MuiBadge-badge': { right: -8, top: -2 } }}>
                <Box sx={{ pr: 2 }}>Employee Requests</Box>
              </Badge>
            } />
            <Tab value="changereq" label={
              <Badge badgeContent={changeRequests.filter(r => r.status === 'pending').length} color="error" max={99} sx={{ '& .MuiBadge-badge': { right: -8, top: -2 } }}>
                <Box sx={{ pr: 2 }}>Change Requests</Box>
              </Badge>
            } />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          ) : (
            <>
              {tab === 'pending'  && tableFor(pending,  true,  '⏳ Pending Approval')}
              {tab === 'approved' && tableFor(approved, false, '✓ Approved Employees')}
              {tab === 'rejected' && tableFor(rejected, false, '✗ Rejected Registrations')}
              {tab === 'posreq'   && (
                <Box>
                  <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: BRAND.primary }}>🔔 Employee Position Requests</Typography>
                    <Typography variant="caption" color="text.secondary">{posRequests.length} total</Typography>
                  </Box>
                  {posReqLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} sx={{ color: BRAND.primary }} /></Box>
                  ) : posRequests.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                      <Typography variant="body2">No position change requests</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary', borderBottom: '2px solid', borderColor: 'divider', py: 1.5, bgcolor: 'transparent' } }}>
                            <TableCell>Employee</TableCell>
                            <TableCell>Current Position</TableCell>
                            <TableCell>Requested Position</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Requested On</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {posRequests.map(r => (
                            <TableRow key={r._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell><Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>{r.employeeName}</Typography></TableCell>
                              <TableCell><Chip label={r.currentPosition} size="small" sx={{ bgcolor: 'action.hover', fontWeight: 600 }} /></TableCell>
                              <TableCell>
                                <Chip label={r.requestedPosition} size="small"
                                  sx={{ bgcolor: BRAND.primaryLight || '#e8f5ee', color: BRAND.primary, fontWeight: 700, border: `1px solid ${BRAND.primary}30` }} />
                              </TableCell>
                              <TableCell><Typography variant="caption" color="text.secondary">{r.reason || '–'}</Typography></TableCell>
                              <TableCell><Typography variant="caption" color="text.secondary">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Typography></TableCell>
                              <TableCell><StatusChip status={r.status} /></TableCell>
                              <TableCell>
                                {r.status === 'pending' && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button size="small" variant="contained" startIcon={<CheckCircleIcon />}
                                      onClick={() => approvePosReq(r._id)}
                                      sx={{ bgcolor: BRAND.primary, fontWeight: 700, fontSize: 11, '&:hover': { bgcolor: BRAND.primaryMid } }}>
                                      Approve
                                    </Button>
                                    <Button size="small" variant="outlined" startIcon={<CancelIcon />}
                                      onClick={() => rejectPosReq(r._id)}
                                      sx={{ color: '#c62828', borderColor: '#c62828', fontWeight: 700, fontSize: 11, '&:hover': { bgcolor: '#fdecea' } }}>
                                      Reject
                                    </Button>
                                  </Box>
                                )}
                                {r.status !== 'pending' && <Typography variant="caption" color="text.secondary">–</Typography>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
              {tab === 'changereq' && (
                <Box>
                  <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: BRAND.primary }}>🔔 Profile & Merchant Change Requests</Typography>
                    <Typography variant="caption" color="text.secondary">{changeRequests.length} total</Typography>
                  </Box>
                  {changeReqLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} sx={{ color: BRAND.primary }} /></Box>
                  ) : changeRequests.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}><Typography variant="body2">No change requests</Typography></Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary', borderBottom: '2px solid', borderColor: 'divider', py: 1.5, bgcolor: 'transparent' } }}>
                            <TableCell>Employee</TableCell><TableCell>Type</TableCell><TableCell>Details</TableCell>
                            <TableCell>Reason</TableCell><TableCell>Date</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {changeRequests.map(r => {
                            const typeLabel = r.type === 'profile_change' ? '👤 Profile Change' : r.type === 'merchant_edit' ? '✏ Merchant Edit' : '🗑 Merchant Delete';
                            const details   = r.type === 'profile_change' ? Object.entries(r.profileChanges || {}).map(([k,v]) => `${k}: ${v}`).slice(0,3).join(', ') : (r.merchantName || '–');
                            return (
                              <TableRow key={r._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                <TableCell><Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>{r.employeeName}</Typography></TableCell>
                                <TableCell><Chip label={typeLabel} size="small" sx={{ bgcolor: 'action.hover', fontWeight: 600, fontSize: 11 }} /></TableCell>
                                <TableCell><Typography variant="caption" sx={{ color: 'text.primary', maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{details}</Typography></TableCell>
                                <TableCell><Typography variant="caption" color="text.secondary">{r.reason || '–'}</Typography></TableCell>
                                <TableCell><Typography variant="caption" color="text.secondary">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Typography></TableCell>
                                <TableCell><StatusChip status={r.status} /></TableCell>
                                <TableCell>
                                  {r.status === 'pending' ? (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button size="small" variant="contained" startIcon={<CheckCircleIcon />} onClick={() => approveChangeReq(r._id)}
                                        sx={{ bgcolor: BRAND.primary, fontWeight: 700, fontSize: 11, '&:hover': { bgcolor: BRAND.primaryMid } }}>Approve</Button>
                                      <Button size="small" variant="outlined" startIcon={<CancelIcon />} onClick={() => rejectChangeReq(r._id)}
                                        sx={{ color: '#c62828', borderColor: '#c62828', fontWeight: 700, fontSize: 11, '&:hover': { bgcolor: '#fdecea' } }}>Reject</Button>
                                    </Box>
                                  ) : <Typography variant="caption" color="text.secondary">–</Typography>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: BRAND.primary, pb: 1 }}>
          ✏ Edit Employee — {editEmp?.newJoinerName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>

            <TextField fullWidth label="Full Name" size="small"
              value={editForm.newJoinerName || ''}
              onChange={e => setEditForm(f => ({ ...f, newJoinerName: e.target.value }))}
              sx={{ gridColumn: '1/-1' }} />

            {/* Position — admin can change this */}
            <FormControl fullWidth size="small">
              <InputLabel>Position</InputLabel>
              <Select value={editForm.position || ''} label="Position"
                onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}>
                <MenuItem value="Team Lead">Team Lead</MenuItem>
                <MenuItem value="FSE">FSE</MenuItem>
              </Select>
            </FormControl>

            <TextField fullWidth label="Location" size="small"
              value={editForm.location || ''}
              onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />

            <TextField fullWidth label="Reporting Manager" size="small"
              value={editForm.reportingManager || ''}
              onChange={e => setEditForm(f => ({ ...f, reportingManager: e.target.value }))}
              sx={{ gridColumn: '1/-1' }} />

            <TextField fullWidth label="Phone Number" size="small"
              value={editForm.newJoinerPhone || ''}
              onChange={e => setEditForm(f => ({ ...f, newJoinerPhone: e.target.value }))} />

            <TextField fullWidth label="Joiner Email ID" size="small"
              value={editForm.newJoinerEmailId || ''}
              onChange={e => setEditForm(f => ({ ...f, newJoinerEmailId: e.target.value }))} />

          </Box>

          <Alert severity="info" sx={{ mt: 2, fontSize: 12 }}>
            Position change takes effect immediately. The employee will see the updated position on their next login.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={editSaving}
            startIcon={editSaving ? <CircularProgress size={14} /> : null}
            sx={{ bgcolor: BRAND.primary, fontWeight: 700, '&:hover': { bgcolor: BRAND.primaryMid } }}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
