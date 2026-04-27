import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import { exportExcel } from '../utils/exportCsv';

const EMPTY = { firstName: '', lastName: '', phone: '', role: '', category: '', password: '', active: true };
const CATEGORIES = ['TRANSPORT', 'ACCOMMODATION', 'COOKING', 'SERVING'];
const ROLE_MAP = {
  TRANSPORT: ['Driver', 'Coordinator', 'Navigator', 'Helper', 'Other'],
  ACCOMMODATION: ['Manager', 'Caretaker', 'Housekeeper', 'Coordinator', 'Helper', 'Other'],
  COOKING: ['Head Cook', 'Cook', 'Kitchen Helper', 'Coordinator', 'Other'],
  SERVING: ['Server', 'Waiter', 'Helper', 'Coordinator', 'Other'],
};
const CAT_ICONS = { TRANSPORT: '🚗', ACCOMMODATION: '🏠', COOKING: '🍳', SERVING: '🍽️' };
const CAT_LABELS = { TRANSPORT: 'Transport', ACCOMMODATION: 'Accommodation', COOKING: 'Cooking', SERVING: 'Serving' };

export default function Helpers() {
  const [helpers, setHelpers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { addToast } = useToast();

  const load = () => api.getHelpers().then(setHelpers).catch((err) => addToast(err.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const set = (field) => (e) => {
    const val = e.target.value;
    if (field === 'category') {
      const newRoles = ROLE_MAP[val] || [];
      setForm((prev) => ({
        ...prev,
        category: val,
        role: newRoles.includes(prev.role) ? prev.role : '',
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: val }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.updateHelper(editing.id, form);
      } else {
        await api.createHelper(form);
      }
      setForm(EMPTY);
      setEditing(null);
      setShowForm(false);
      addToast(editing ? 'Crew member updated' : 'Crew member added', 'success');
      load();
    } catch (err) { addToast(err.message); }
  };

  const handleEdit = (h) => {
    setEditing(h);
    setForm({ firstName: h.firstName || '', lastName: h.lastName || '', phone: h.phone || '', role: h.role || '', category: h.category || '', password: '', active: h.active !== false });
    setShowForm(true);
  };

  const handleDelete = (id) => setConfirmDelete(id);
  const doDelete = async () => {
    try {
      await api.deleteHelper(confirmDelete);
      setConfirmDelete(null);
      addToast('Crew member deleted', 'success');
      load();
    } catch (err) {
      setConfirmDelete(null);
      if (err.events && err.events.length) {
        addToast(`Cannot delete \u2014 assigned to: ${err.events.join(', ')}`, 'error');
      } else {
        addToast(err.message, 'error');
      }
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(false);
  };

  // Stats by category
  const catCounts = {};
  helpers.forEach((h) => {
    const cat = h.category || 'OTHER';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  // Filtered list
  const filtered = helpers.filter((h) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || `${h.firstName} ${h.lastName} ${h.phone || ''} ${h.role || ''} ${h.category || ''}`.toLowerCase().includes(q);
    const matchesCat = catFilter === 'ALL' || h.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>🛠️ Event Crew</h2>
        <p className="muted">Manage your event support crew — transport, accommodation, cooking &amp; serving</p>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{helpers.length}</span>
            <span className="summary-label">Total Crew</span>
          </div>
        </div>
        {CATEGORIES.map((cat) => (
          <div
            key={cat}
            className={`summary-card ${catFilter === cat ? 'summary-card--active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => { setCatFilter(catFilter === cat ? 'ALL' : cat); setPage(1); }}
          >
            <div className="summary-card-body">
              <span className="summary-number">{CAT_ICONS[cat]} {catCounts[cat] || 0}</span>
              <span className="summary-label">{CAT_LABELS[cat]}</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card">
          <h3>{editing ? '✏️ Edit Crew Member' : '🆕 New Crew Member'}</h3>
          <form onSubmit={handleSave} style={{ marginTop: 12 }}>
            <div className="form-row">
              <label>First Name <input value={form.firstName} onChange={set('firstName')} required placeholder="e.g. Ramesh" /></label>
              <label>Last Name <input value={form.lastName} onChange={set('lastName')} required placeholder="e.g. Kumar" /></label>
              <label>Phone <input value={form.phone} onChange={set('phone')} required placeholder="Required" /></label>
            </div>
            <div className="form-row">
              <label>Category
                <CustomSelect
                  value={form.category}
                  onChange={set('category')}
                  options={CATEGORIES.map((c) => ({ value: c, label: CAT_LABELS[c] }))}
                  placeholder="Select category"
                  required
                />
              </label>
              <label>Role
                <CustomSelect
                  value={form.role}
                  onChange={set('role')}
                  options={(ROLE_MAP[form.category] || []).map((r) => ({ value: r, label: r }))}
                  placeholder={form.category ? 'Select role' : 'Select category first'}
                  disabled={!form.category}
                />
              </label>
              <label>Password <input type="password" value={form.password} onChange={set('password')} placeholder={editing ? 'Leave blank to keep' : 'Login password'} {...(!editing ? { required: true } : {})} /></label>
              <label className="check-label" style={{ alignSelf: 'center', marginTop: 20 }}><input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Active</label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Member'}</button>
              <button type="button" className="btn" onClick={handleCancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="guests-toolbar">
        <div className="guests-search-wrap">
          <span className="guests-search-icon">🔍</span>
          <input
            className="guests-search-input"
            placeholder="Search by name, phone, role, category..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="guests-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        {catFilter !== 'ALL' && (
          <button className="btn btn-sm" onClick={() => { setCatFilter('ALL'); setPage(1); }}>
            Clear filter: {CAT_LABELS[catFilter]} ✕
          </button>
        )}
        <span className="guests-count-badge">
          {filtered.length} of {helpers.length} member{helpers.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-export" onClick={() => exportExcel('crew.xlsx', [
          { label: 'First Name', key: 'firstName', width: 16 },
          { label: 'Last Name', key: 'lastName', width: 16 },
          { label: 'Category', key: (h) => CAT_LABELS[h.category] || h.category || '' },
          { label: 'Role', key: 'role' },
          { label: 'Phone', key: 'phone', width: 16 },
        ], filtered, { title: 'Event Crew', sheetName: 'Crew' })} disabled={filtered.length === 0}>
          📥 Export
        </button>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(!showForm); }}>
          {showForm && !editing ? '✕ Close' : '+ Add Member'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="guests-empty">
          <div className="guests-empty-icon">{helpers.length === 0 ? '🛠️' : '🔍'}</div>
          <h3>{helpers.length === 0 ? 'No crew members yet' : 'No results found'}</h3>
          <p className="muted">
            {helpers.length === 0
              ? 'Start building your event crew by adding your first member.'
              : 'Try adjusting your search or clearing the filter.'}
          </p>
        </div>
      ) : (
        <div className="guest-table-wrap">
          <table className="guest-table">
            <thead>
              <tr>
                <th style={{ width: 45 }}>#</th>
                <th style={{ minWidth: 180 }}>Name</th>
                <th style={{ width: 150 }}>Category</th>
                <th style={{ width: 140 }}>Role</th>
                <th style={{ width: 150 }}>Phone</th>
                <th style={{ width: 80, textAlign: 'center' }}>Status</th>
                <th style={{ width: 100, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((h, i) => (
                <React.Fragment key={h.id}>
                  <tr
                    className={`guest-row-clickable ${selectedId === h.id ? 'guest-row-selected' : ''}`}
                    onClick={() => setSelectedId(selectedId === h.id ? null : h.id)}
                  >
                    <td className="guest-row-num">{(page - 1) * pageSize + i + 1}</td>
                    <td>
                      <div className="guest-name-cell">
                        <span className="guest-avatar">{(h.firstName || '?').charAt(0).toUpperCase()}{(h.lastName || '?').charAt(0).toUpperCase()}</span>
                        <span className="guest-name">{h.firstName} {h.lastName}</span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {h.category ? (
                        <span className="badge">{CAT_ICONS[h.category] || '📋'} {CAT_LABELS[h.category] || h.category}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {h.role ? <span className="badge badge-role">{h.role}</span> : <span className="muted">—</span>}
                    </td>
                    <td className="guest-phone">{h.phone || <span className="muted">—</span>}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${h.active !== false ? '' : 'badge-inactive'}`} style={h.active === false ? { background: 'rgba(214,48,49,.1)', color: '#d63031' } : { background: 'rgba(0,184,148,.1)', color: '#00b894' }}>
                        {h.active !== false ? '✅ Active' : '⛔ Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); handleEdit(h); }}>✏️</button>
                      <button className="btn-icon btn-danger" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(h.id); }}>🗑️</button>
                    </td>
                  </tr>
                  {selectedId === h.id && (
                    <tr className="guest-detail-row">
                      <td colSpan="7">
                        <div className="guest-detail-panel">
                          <div className="guest-detail-grid">
                            <div className="guest-detail-section">
                              <h4>👤 Member Details</h4>
                              <div className="guest-detail-field">
                                <span className="guest-detail-label">Full Name</span>
                                <span className="guest-detail-value">{h.firstName} {h.lastName}</span>
                              </div>
                              <div className="guest-detail-field">
                                <span className="guest-detail-label">Phone</span>
                                <span className="guest-detail-value">{h.phone || '—'}</span>
                              </div>
                            </div>
                            <div className="guest-detail-section">
                              <h4>🏷️ Assignment</h4>
                              <div className="guest-detail-field">
                                <span className="guest-detail-label">Category</span>
                                <span className="guest-detail-value">
                                  {h.category ? `${CAT_ICONS[h.category] || ''} ${CAT_LABELS[h.category] || h.category}` : '—'}
                                </span>
                              </div>
                              <div className="guest-detail-field">
                                <span className="guest-detail-label">Role</span>
                                <span className="guest-detail-value">{h.role || '—'}</span>
                              </div>
                              <div className="guest-detail-field">
                                <span className="guest-detail-label">Status</span>
                                <span className="guest-detail-value">{h.active !== false ? '✅ Active' : '⛔ Inactive'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="guest-detail-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => handleEdit(h)}>✏️ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(h.id)}>🗑️ Delete</button>
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
        title="Delete Crew Member"
        message="Are you sure you want to delete this crew member? This action cannot be undone."
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
