import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import GuestForm from '../components/GuestForm';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { exportExcel } from '../utils/exportCsv';
import ExcelJS from 'exceljs';

const TYPE_ICONS = { FAMILY: '👨‍👩‍👧‍👦', FRIEND: '🤝', VIP: '⭐', COLLEAGUE: '💼', OTHER: '👤' };
const TYPE_LABELS = { FAMILY: 'Family', FRIEND: 'Friend', VIP: 'VIP', COLLEAGUE: 'Colleague', OTHER: 'Other' };

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { addToast } = useToast();

  const load = () => api.getAllGuests().then(setGuests).catch((err) => addToast(err.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    try {
      if (editing) {
        await api.updateGuest(editing.id, data);
        setEditing(null);
      } else {
        await api.createGuest(data);
      }
      setShowForm(false);
      addToast(editing ? 'Guest updated' : 'Guest added', 'success');
      load();
    } catch (err) { addToast(err.message); }
  };

  const remove = (id) => setConfirmDelete(id);
  const doDelete = async () => {
    try {
      await api.deleteGuest(confirmDelete);
      setConfirmDelete(null);
      addToast('Guest deleted', 'success');
      load();
    } catch (err) {
      setConfirmDelete(null);
      if (err.events && err.events.length) {
        addToast(`Cannot delete — assigned to: ${err.events.join(', ')}`, 'error');
      } else {
        addToast(err.message, 'error');
      }
    }
  };

  const startEdit = (g) => { setEditing(g); setShowForm(true); };
  const cancel = () => { setEditing(null); setShowForm(false); };

  const importRef = useRef(null);
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { addToast('No worksheet found'); return; }
      const headers = [];
      ws.getRow(1).eachCell((cell, col) => { headers[col] = String(cell.value || '').trim().toLowerCase(); });
      const colMap = {};
      const mapping = { firstname: 'firstName', 'first name': 'firstName', lastname: 'lastName', 'last name': 'lastName',
        email: 'email', phone: 'phone', type: 'guestType', guesttype: 'guestType', 'guest type': 'guestType',
        reference: 'referencePerson', referenceperson: 'referencePerson', 'reference person': 'referencePerson',
        country: 'country', state: 'state', district: 'district', village: 'village' };
      headers.forEach((h, i) => { if (mapping[h]) colMap[mapping[h]] = i; });
      if (!colMap.firstName) { addToast('Column "First Name" not found in spreadsheet'); return; }
      const guests = [];
      const skippedRows = [];
      ws.eachRow((row, rowNum) => {
        if (rowNum <= 1) return;
        const val = (field) => colMap[field] ? String(row.getCell(colMap[field]).value || '').trim() : '';
        const firstName = val('firstName');
        if (!firstName) return;
        const phone = val('phone');
        if (!phone) { skippedRows.push(rowNum); return; }
        guests.push({ firstName, lastName: val('lastName'), email: val('email'), phone,
          guestType: (val('guestType') || 'OTHER').toUpperCase(), referencePerson: val('referencePerson'),
          country: val('country'), state: val('state'), district: val('district'), village: val('village') });
      });
      if (skippedRows.length > 0) { addToast(`Skipped ${skippedRows.length} row(s) missing phone: row ${skippedRows.join(', ')}`); }
      // Deduplicate within file by phone
      const seen = new Set();
      const unique = [];
      let fileDups = 0;
      for (const g of guests) {
        if (seen.has(g.phone)) { fileDups++; continue; }
        seen.add(g.phone);
        unique.push(g);
      }
      if (unique.length === 0) { addToast('No valid rows found (phone is required for every guest)'); return; }
      const res = await api.bulkCreateGuests(unique);
      const imported = res.imported ?? unique.length;
      const dbDups = res.skipped ?? 0;
      const totalSkipped = fileDups + dbDups;
      const parts = [`${imported} guest${imported !== 1 ? 's' : ''} imported`];
      if (totalSkipped > 0) parts.push(`${totalSkipped} duplicate${totalSkipped !== 1 ? 's' : ''} skipped`);
      addToast(parts.join(', '), imported > 0 ? 'success' : undefined);
      load();
    } catch (err) { addToast(err.message); }
    e.target.value = '';
  };

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || `${g.firstName} ${g.lastName} ${g.referencePerson || ''} ${g.guestType} ${g.email || ''} ${g.phone || ''}`.toLowerCase().includes(q);
    const matchesType = typeFilter === 'ALL' || g.guestType === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Stats by type
  const typeCounts = {};
  guests.forEach((g) => { typeCounts[g.guestType] = (typeCounts[g.guestType] || 0) + 1; });

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>👥 Guests</h2>
        <p className="muted">Manage your guest directory across all events</p>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{guests.length}</span>
            <span className="summary-label">Total Guests</span>
          </div>
        </div>
        {Object.entries(typeCounts).map(([type, count]) => (
          <div
            key={type}
            className={`summary-card ${typeFilter === type ? 'summary-card--active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => { setTypeFilter(typeFilter === type ? 'ALL' : type); setPage(1); }}
          >
            <div className="summary-card-body">
              <span className="summary-number">{TYPE_ICONS[type] || '👤'} {count}</span>
              <span className="summary-label">{TYPE_LABELS[type] || type}</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card">
          <h3>{editing ? '✏️ Edit Guest' : '🆕 New Guest'}</h3>
          <GuestForm guest={editing} onSave={save} onCancel={cancel} />
        </div>
      )}

      {/* Search + filter bar */}
      <div className="guests-toolbar">
        <div className="guests-search-wrap">
          <span className="guests-search-icon">🔍</span>
          <input
            className="guests-search-input"
            placeholder="Search by name, phone, email, reference..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="guests-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        {typeFilter !== 'ALL' && (
          <button className="btn btn-sm" onClick={() => { setTypeFilter('ALL'); setPage(1); }}>
            Clear filter: {TYPE_LABELS[typeFilter] || typeFilter} ✕
          </button>
        )}
        <span className="guests-count-badge">
          {filtered.length} of {guests.length} guest{guests.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-export" onClick={() => exportExcel('guests.xlsx', [
          { label: 'First Name', key: 'firstName' },
          { label: 'Last Name', key: 'lastName' },
          { label: 'Type', key: (g) => TYPE_LABELS[g.guestType] || g.guestType },
          { label: 'Email', key: 'email', width: 28 },
          { label: 'Phone', key: 'phone', width: 16 },
          { label: 'Reference Person', key: 'referencePerson' },
          { label: 'Country', key: 'country' },
          { label: 'State', key: 'state' },
          { label: 'District', key: 'district' },
          { label: 'Village', key: 'village' },
        ], filtered, { title: 'Guest Directory', sheetName: 'Guests' })} disabled={filtered.length === 0}>
          📥 Export
        </button>
        <input type="file" accept=".xlsx,.xls" ref={importRef} style={{ display: 'none' }} onChange={handleImport} />
        <button className="btn btn-import" onClick={() => importRef.current?.click()}>📤 Import</button>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(!showForm); }}>
          {showForm && !editing ? '✕ Close' : '+ Add Guest'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="guests-empty">
          <div className="guests-empty-icon">{guests.length === 0 ? '👥' : '🔍'}</div>
          <h3>{guests.length === 0 ? 'No guests yet' : 'No results found'}</h3>
          <p className="muted">
            {guests.length === 0
              ? 'Start building your guest directory by adding your first guest above.'
              : 'Try adjusting your search or clearing the filter.'}
          </p>
        </div>
      ) : (
        <div className="guest-table-wrap">
          <table className="guest-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Guest</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Reference</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((g, idx) => (
                <React.Fragment key={g.id}>
                <tr
                  className={`guest-row-clickable ${selectedId === g.id ? 'guest-row-selected' : ''}`}
                  onClick={() => setSelectedId(selectedId === g.id ? null : g.id)}
                >
                  <td className="guest-row-num">{(page - 1) * pageSize + idx + 1}</td>
                  <td>
                    <div className="guest-name-cell">
                      <div className="guest-avatar">{(g.firstName || '?')[0]}{(g.lastName || '?')[0]}</div>
                      <div>
                        <strong className="guest-name">{g.firstName} {g.lastName}</strong>
                        {g.email && <span className="guest-email">{g.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-type-${(g.guestType || 'other').toLowerCase()}`}>
                      {TYPE_ICONS[g.guestType] || '👤'} {TYPE_LABELS[g.guestType] || g.guestType}
                    </span>
                  </td>
                  <td>
                    {g.phone
                      ? <span className="guest-phone">📞 {g.phone}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    {g.referencePerson
                      ? <span className="guest-ref">🔗 {g.referencePerson}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    {[g.village, g.district, g.state].filter(Boolean).length > 0
                      ? <span className="guest-location">📍 {[g.village, g.district, g.state].filter(Boolean).join(', ')}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); startEdit(g); }} title="Edit">✏️</button>
                      <button className="btn btn-sm btn-icon btn-danger" onClick={(e) => { e.stopPropagation(); remove(g.id); }} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
                {selectedId === g.id && (
                  <tr className="guest-detail-row">
                    <td colSpan="7">
                      <div className="guest-detail-panel">
                        <div className="guest-detail-grid">
                          <div className="guest-detail-section">
                            <h4>📋 Personal Info</h4>
                            <div className="guest-detail-field">
                              <span className="guest-detail-label">Full Name</span>
                              <span className="guest-detail-value">{g.firstName} {g.lastName}</span>
                            </div>
                            <div className="guest-detail-field">
                              <span className="guest-detail-label">Email</span>
                              <span className="guest-detail-value">{g.email || <em className="muted">Not provided</em>}</span>
                            </div>
                            <div className="guest-detail-field">
                              <span className="guest-detail-label">Phone</span>
                              <span className="guest-detail-value">{g.phone || <em className="muted">Not provided</em>}</span>
                            </div>
                            <div className="guest-detail-field">
                              <span className="guest-detail-label">Reference Person</span>
                              <span className="guest-detail-value">{g.referencePerson || <em className="muted">Not provided</em>}</span>
                            </div>
                          </div>
                          <div className="guest-detail-section">
                            <h4>📍 Address</h4>
                            <div className="guest-detail-field">
                              <span className="guest-detail-label">Country</span>
                              <span className="guest-detail-value">{g.country || <em className="muted">—</em>}</span>
                            </div>
                            <div className="guest-detail-field">
                              <span className="guest-detail-label">State</span>
                              <span className="guest-detail-value">{g.state || <em className="muted">—</em>}</span>
                            </div>
                            <div className="guest-detail-field">
                              <span className="guest-detail-label">District</span>
                              <span className="guest-detail-value">{g.district || <em className="muted">—</em>}</span>
                            </div>
                            <div className="guest-detail-field">
                              <span className="guest-detail-label">Village</span>
                              <span className="guest-detail-value">{g.village || <em className="muted">—</em>}</span>
                            </div>
                          </div>
                        </div>
                        <div className="guest-detail-actions">
                          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); startEdit(g); }}>✏️ Edit Guest</button>
                          <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); remove(g.id); }}>🗑️ Delete</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}
      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete Guest"
        message="Are you sure you want to delete this guest? This action cannot be undone."
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
