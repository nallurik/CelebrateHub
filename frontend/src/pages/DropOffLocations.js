import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import CustomSelect from '../components/CustomSelect';

const EMPTY = { name: '', locationType: 'GENERAL', address: '', contactPerson: '', contactPhone: '', notes: '' };
const LOC_TYPES = ['GENERAL', 'TRANSPORT', 'ACCOMMODATION'];
const LOC_TYPE_LABELS = { GENERAL: 'General', TRANSPORT: 'Transport', ACCOMMODATION: 'Accommodation' };
const LOC_TYPE_ICONS = { GENERAL: '📍', TRANSPORT: '🚗', ACCOMMODATION: '🏠' };

export default function DropOffLocations() {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [phoneError, setPhoneError] = useState('');
  const { addToast } = useToast();

  const load = () => {
    api.getDropOffLocations()
      .then((locs) => setLocations(locs || []))
      .catch((err) => addToast(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return locations;
    const q = search.toLowerCase();
    return locations.filter(loc =>
      `${loc.name || ''} ${loc.address || ''} ${loc.contactPerson || ''} ${loc.contactPhone || ''} ${loc.notes || ''} ${LOC_TYPE_LABELS[loc.locationType] || ''}`.toLowerCase().includes(q)
    );
  }, [locations, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, contactPhone: val }));
    if (val.length > 0 && val.length < 10) setPhoneError('Phone must be 10 digits');
    else setPhoneError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.contactPhone && form.contactPhone.length !== 10) { setPhoneError('Phone must be exactly 10 digits'); return; }
    try {
      if (editing) {
        await api.updateDropOffLocation(editing.id, form);
      } else {
        await api.createDropOffLocation(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
      setPhoneError('');
      addToast(editing ? 'Location updated' : 'Location added', 'success');
      load();
    } catch (err) { addToast(err.message); }
  };

  const startEdit = (loc) => {
    setEditing(loc);
    setForm({ name: loc.name || '', locationType: loc.locationType || 'GENERAL', address: loc.address || '', contactPerson: loc.contactPerson || '', contactPhone: loc.contactPhone || '', notes: loc.notes || '' });
    setPhoneError('');
    setShowForm(true);
  };

  const doDelete = async () => {
    try {
      await api.deleteDropOffLocation(confirmDelete);
      setConfirmDelete(null);
      addToast('Location deleted', 'success');
      load();
    } catch (err) { addToast(err.message); setConfirmDelete(null); }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>📍 Locations</h2>
        <p className="muted">Directory of all locations — use these for transport pickup/drop-off and accommodation assignments</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{locations.length}</span>
            <span className="summary-label">Locations</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>{editing ? '✏️ Edit Location' : '🆕 New Location'}</h3>
          <form onSubmit={handleSave} style={{ marginTop: 12 }}>
            <fieldset>
              <legend>Location Details</legend>
              <div className="form-row">
                <label>Name * <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                <label style={{ flex: '0 0 160px' }}>Type
                  <CustomSelect
                    value={form.locationType}
                    onChange={(e) => setForm({ ...form, locationType: e.target.value })}
                    options={LOC_TYPES.map(t => ({ value: t, label: `${LOC_TYPE_ICONS[t]} ${LOC_TYPE_LABELS[t]}` }))}
                    placeholder="Select type"
                  />
                </label>
              </div>
              <div className="form-row">
                <label style={{ flex: '1 1 100%' }}>Address <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
              </div>
              <div className="form-row">
                <label>Contact Person <input className="form-control" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></label>
                <label>Contact Phone
                  <input className="form-control" value={form.contactPhone} inputMode="numeric" maxLength={10}
                    onChange={handlePhoneChange}
                    placeholder="10 digits" />
                  {phoneError
                    ? <span className="phone-hint" style={{ color: 'var(--danger)' }}>{phoneError}</span>
                    : <span className="phone-hint">Digits only, max 10</span>}
                </label>
              </div>
              <div className="form-row">
                <label>Notes <textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></label>
              </div>
            </fieldset>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Location'}</button>
              <button type="button" className="btn" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); setPhoneError(''); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="guests-toolbar">
        <div className="guests-search-wrap">
          <span className="guests-search-icon">🔍</span>
          <input
            type="text"
            className="guests-search-input"
            placeholder="Search by name, address, contact..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="guests-search-clear" type="button" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <span className="guests-count-badge">
          {filtered.length} of {locations.length} location{locations.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}>
          {showForm && !editing ? '✕ Close' : '+ Add Location'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="guests-empty">
          <div className="guests-empty-icon">📍</div>
          <h3>{search ? 'No matching locations' : 'No locations yet'}</h3>
          <p className="muted">{search ? 'Try a different search term.' : 'Add your first location above.'}</p>
        </div>
      ) : (
        <>
          <div className="guest-table-wrap">
            <table className="guest-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((loc, idx) => (
                  <React.Fragment key={loc.id}>
                  <tr
                    className={`guest-row-clickable ${selectedId === loc.id ? 'guest-row-selected' : ''}`}
                    onClick={() => setSelectedId(selectedId === loc.id ? null : loc.id)}
                  >
                    <td className="guest-row-num">{(page - 1) * pageSize + idx + 1}</td>
                    <td>
                      <div className="guest-name-cell">
                        <div className="guest-avatar" style={{ background: 'linear-gradient(135deg, #0984e3, #6c5ce7)' }}>
                          {LOC_TYPE_ICONS[loc.locationType] || '📍'}
                        </div>
                        <div>
                          <strong className="guest-name">{loc.name}</strong>
                          {loc.address && <span className="guest-email">📍 {loc.address}</span>}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge" style={{ whiteSpace: 'nowrap' }}>{LOC_TYPE_ICONS[loc.locationType] || '📍'} {LOC_TYPE_LABELS[loc.locationType] || 'General'}</span></td>
                    <td>{loc.address || <span className="muted">—</span>}</td>
                    <td>
                      {loc.contactPerson && <span>{loc.contactPerson}</span>}
                      {loc.contactPhone && <span className="muted" style={{ display: 'block', fontSize: '.85rem' }}>📞 {loc.contactPhone}</span>}
                      {!loc.contactPerson && !loc.contactPhone && <span className="muted">—</span>}
                    </td>
                    <td>{loc.notes || <span className="muted">—</span>}</td>
                    <td>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); startEdit(loc); }} title="Edit">✏️</button>
                        <button className="btn btn-sm btn-icon btn-danger" onClick={(e) => { e.stopPropagation(); setConfirmDelete(loc.id); }} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                  {selectedId === loc.id && (
                    <tr className="guest-detail-row">
                      <td colSpan="7">
                        <div className="guest-detail-panel">
                          <div className="guest-detail-grid">
                            <div className="guest-detail-section">
                              <h4>📍 Location Info</h4>
                              <div className="guest-detail-field"><span className="guest-detail-label">Name</span><span className="guest-detail-value">{loc.name}</span></div>
                              <div className="guest-detail-field"><span className="guest-detail-label">Type</span><span className="guest-detail-value">{LOC_TYPE_ICONS[loc.locationType] || '📍'} {LOC_TYPE_LABELS[loc.locationType] || 'General'}</span></div>
                              <div className="guest-detail-field"><span className="guest-detail-label">Address</span><span className="guest-detail-value">{loc.address || '—'}</span></div>
                            </div>
                            <div className="guest-detail-section">
                              <h4>📞 Contact</h4>
                              <div className="guest-detail-field"><span className="guest-detail-label">Contact Person</span><span className="guest-detail-value">{loc.contactPerson || '—'}</span></div>
                              <div className="guest-detail-field"><span className="guest-detail-label">Phone</span><span className="guest-detail-value">{loc.contactPhone || '—'}</span></div>
                            </div>
                            <div className="guest-detail-section">
                              <h4>📝 Notes</h4>
                              <div className="guest-detail-field"><span className="guest-detail-value" style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{loc.notes || '—'}</span></div>
                            </div>
                          </div>
                          <div className="guest-detail-actions">
                            <button className="btn btn-sm btn-primary" onClick={() => startEdit(loc)}>✏️ Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(loc.id)}>🗑️ Delete</button>
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
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete Location"
        message="Are you sure you want to delete this location?"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
