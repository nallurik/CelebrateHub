import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import Pagination from '../components/Pagination';
import { exportExcel } from '../utils/exportCsv';

const PLACE_TYPES = ['GUEST_HOUSE', 'INDEPENDENT_HOUSE', 'HOTEL', 'RELATIVE_HOUSE', 'HOSTEL', 'OTHER'];
const PLACE_LABELS = { GUEST_HOUSE: 'Guest House', INDEPENDENT_HOUSE: 'Independent House', HOTEL: 'Hotel', RELATIVE_HOUSE: 'Relative House', HOSTEL: 'Hostel', OTHER: 'Other' };
const PLACE_EMPTY = { name: '', type: 'GUEST_HOUSE', capacity: 0, address: '', contactPerson: '', contactPhone: '', notes: '', locationId: '', active: true };
const TYPE_ICONS = { GUEST_HOUSE: '🏠', INDEPENDENT_HOUSE: '🏡', HOTEL: '🏨', RELATIVE_HOUSE: '👨‍👩‍👧', HOSTEL: '🏢', OTHER: '🏘️' };

export default function Accommodations() {
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(PLACE_EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('places');
  const [search, setSearch] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedGuestKey, setSelectedGuestKey] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const today = new Date().toISOString().slice(0, 10);
  const [filterDate, setFilterDate] = useState(today);
  const [occupancyData, setOccupancyData] = useState(null); // null = no date, array = date-filtered
  const { addToast } = useToast();

  const load = () => {
    Promise.all([api.getAccommodationPlaces(), api.getEvents(), api.getDropOffLocations()])
      .then(([p, ev, locs]) => { setPlaces(p || []); setEvents(ev || []); setLocations(locs || []); })
      .catch((err) => addToast(err.message))
      .finally(() => setLoading(false));
    // Refresh date-filtered occupancy if active
    if (filterDate) {
      api.getAccommodationOccupancy(filterDate, filterDate)
        .then((data) => setOccupancyData(data || []))
        .catch(() => {});
    }
  };

  useEffect(() => { load(); }, []);

  // Fetch date-aware occupancy when date changes
  const fetchOccupancy = useCallback(() => {
    if (filterDate) {
      api.getAccommodationOccupancy(filterDate, filterDate)
        .then((data) => setOccupancyData(data || []))
        .catch((err) => addToast(err.message));
    } else {
      setOccupancyData(null);
    }
  }, [filterDate, addToast]);

  useEffect(() => { fetchOccupancy(); }, [fetchOccupancy]);

  // All event-guests needing accommodation
  const allGuestsRaw = [];
  for (const ev of events) {
    for (const eg of (ev.eventGuests || [])) {
      if (eg.needsAccommodation) {
        const g = eg.guest || {};
        allGuestsRaw.push({ ...eg, firstName: g.firstName, lastName: g.lastName, phone: g.phone, referencePerson: g.referencePerson, guestType: g.guestType, eventName: ev.name, eventId: ev.id });
      }
    }
  }

  // Filter guests by selected date (overlap: fromDate <= filterDate && toDate >= filterDate)
  const allGuests = filterDate
    ? allGuestsRaw.filter((g) => g.accommodationFromDate && g.accommodationToDate && g.accommodationFromDate <= filterDate && g.accommodationToDate >= filterDate)
    : allGuestsRaw;

  // Count filled per place — date-aware when filtered, total otherwise
  const filledByPlace = {};
  const guestsAtPlace = {}; // date-filtered guest details
  if (occupancyData) {
    for (const o of occupancyData) {
      filledByPlace[o.placeId] = o.filled;
      if (o.guests) guestsAtPlace[o.placeId] = o.guests;
    }
  } else {
    for (const ev of events) {
      for (const eg of (ev.eventGuests || [])) {
        if (eg.accommodationPlaceId) {
          filledByPlace[eg.accommodationPlaceId] = (filledByPlace[eg.accommodationPlaceId] || 0) + (eg.adultsCount || 0) + (eg.kidsCount || 0);
        }
      }
    }
  }

  const totalCapacity = places.reduce((s, p) => s + (p.capacity || 0), 0);
  const totalFilled = Object.values(filledByPlace).reduce((s, v) => s + v, 0);
  const totalPeopleNeedStay = allGuests.reduce((s, g) => s + (g.adultsCount || 0) + (g.kidsCount || 0), 0);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.updateAccommodationPlace(editing.id, form);
      } else {
        await api.createAccommodationPlace(form);
      }
      setForm(PLACE_EMPTY);
      setEditing(null);
      setShowForm(false);
      addToast(editing ? 'Place updated' : 'Place added', 'success');
      load();
    } catch (err) { addToast(err.message); }
  };

  const handleEdit = (p) => {
    setEditing(p);
    const matchedLoc = locations.find(l => l.name === p.name);
    setForm({ name: p.name, type: p.type || 'GUEST_HOUSE', capacity: p.capacity || 0, address: p.address || '', contactPerson: p.contactPerson || '', contactPhone: p.contactPhone || '', notes: p.notes || '', locationId: matchedLoc ? matchedLoc.id : '', active: p.active !== false });
    setShowForm(true);
  };

  const handleDelete = (id) => setConfirmDelete(id);
  const doDelete = async () => {
    try {
      await api.deleteAccommodationPlace(confirmDelete);
      setConfirmDelete(null);
      addToast('Place deleted', 'success');
      load();
    } catch (err) { addToast(err.message); setConfirmDelete(null); }
  };

  const handleCancel = () => { setEditing(null); setForm(PLACE_EMPTY); setShowForm(false); };

  const typeLabel = (t) => PLACE_LABELS[t] || t;

  // Guests assigned to a particular place
  const guestsForPlace = (placeId) => {
    const list = [];
    for (const ev of events) {
      for (const eg of (ev.eventGuests || [])) {
        if (eg.accommodationPlaceId === placeId) {
          const g = eg.guest || {};
          list.push({ ...eg, firstName: g.firstName, lastName: g.lastName, eventName: ev.name });
        }
      }
    }
    return list;
  };

  // Filtered places
  const filteredPlaces = places.filter((p) => {
    const q = search.toLowerCase();
    return !q || `${p.name} ${typeLabel(p.type)} ${p.address || ''} ${p.contactPerson || ''}`.toLowerCase().includes(q);
  });

  // Filtered guests
  const filteredGuests = allGuests.filter((g) => {
    const q = search.toLowerCase();
    return !q || `${g.firstName} ${g.lastName} ${g.eventName} ${g.accommodationPlaceName || ''} ${g.phone || ''}`.toLowerCase().includes(q);
  });

  const activeList = tab === 'places' ? filteredPlaces : filteredGuests;
  const totalPages = Math.ceil(activeList.length / pageSize);
  const paginatedPlaces = filteredPlaces.slice((page - 1) * pageSize, page * pageSize);
  const paginatedGuests = filteredGuests.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>🏠 Accommodations</h2>
        <p className="muted">Manage accommodation places and track occupancy</p>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{places.length}</span>
            <span className="summary-label">Places</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{totalCapacity}</span>
            <span className="summary-label">Total Capacity</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{totalFilled}</span>
            <span className="summary-label">Filled</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{totalCapacity - totalFilled}</span>
            <span className="summary-label">Remaining</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{allGuests.length}</span>
            <span className="summary-label">Guests Need Stay</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{totalPeopleNeedStay}</span>
            <span className="summary-label">People Need Stay</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'places' ? 'active' : ''}`} onClick={() => { setTab('places'); setSearch(''); setPage(1); }}>🏠 Places</button>
        <button className={`tab ${tab === 'guests' ? 'active' : ''}`} onClick={() => { setTab('guests'); setSearch(''); setPage(1); }}>👥 Guest Assignments</button>
      </div>

      {/* Form */}
      {showForm && tab === 'places' && (
        <div className="card">
          <h3>{editing ? '✏️ Edit Place' : '🆕 Add Accommodation Place'}</h3>
          <form onSubmit={handleSave} style={{ marginTop: 12 }}>
            <div className="form-row">
              <label>Location *
                <CustomSelect
                  value={form.locationId}
                  onChange={(e) => {
                    const loc = locations.find(l => String(l.id) === String(e.target.value));
                    if (loc) {
                      setForm(prev => ({ ...prev, locationId: loc.id, name: loc.name, address: loc.address || '', contactPerson: loc.contactPerson || '', contactPhone: loc.contactPhone || '' }));
                    } else {
                      setForm(prev => ({ ...prev, locationId: '', name: '', address: '', contactPerson: '', contactPhone: '' }));
                    }
                  }}
                  options={locations.filter(l => l.locationType === 'ACCOMMODATION' && !places.some(p => p.name === l.name && (!editing || editing.id !== p.id))).map(loc => ({
                    value: loc.id, label: `${loc.name}${loc.address ? ` — ${loc.address}` : ''}`
                  }))}
                  placeholder="Select from Locations directory (Accommodation type)"
                  required
                />
              </label>
              <label>Type
                <CustomSelect
                  value={form.type}
                  onChange={set('type')}
                  options={PLACE_TYPES.map((t) => ({ value: t, label: typeLabel(t) }))}
                  placeholder="Select type"
                  required
                />
              </label>
              <label>Capacity (people) <input type="number" min="0" value={form.capacity} onChange={set('capacity')} required /></label>
            </div>
            <div className="form-row">
              <label>Address <input value={form.address} readOnly disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} placeholder="Auto-filled from location" /></label>
              <label>Contact Person <input value={form.contactPerson} readOnly disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} placeholder="Auto-filled from location" /></label>
              <label>Contact Phone <input value={form.contactPhone} readOnly disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} placeholder="Auto-filled from location" /></label>
            </div>
            <div className="form-row">
              <label style={{ flex: '1 1 auto' }}>Notes <input value={form.notes} onChange={set('notes')} placeholder="Any additional info" /></label>
              <label className="check-label" style={{ flex: '0 0 auto', alignSelf: 'flex-end', paddingBottom: 8 }}>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))} /> Active
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Place'}</button>
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
            placeholder={tab === 'places' ? 'Search places...' : 'Search guests...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="guests-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <span className="guests-count-badge" style={{ flexShrink: 0 }}>
          {tab === 'places'
            ? `${filteredPlaces.length} of ${places.length} place${places.length !== 1 ? 's' : ''}`
            : `${filteredGuests.length} of ${allGuests.length} guest${allGuests.length !== 1 ? 's' : ''}`}
        </span>
        <div style={{ width: 200, flexShrink: 0 }}>
          <CustomDatePicker value={filterDate} onChange={(e) => setFilterDate(e.target.value)} placeholder="📅 Availability" />
        </div>
        {filterDate && filterDate !== today && (
          <button className="btn btn-sm" style={{ flexShrink: 0 }} onClick={() => setFilterDate(today)}>Today</button>
        )}
        {tab === 'places' ? (
          <>
            <button className="btn btn-export" onClick={() => exportExcel('accommodation-places.xlsx', [
              { label: 'Name', key: 'name', width: 24 },
              { label: 'Type', key: (p) => PLACE_LABELS[p.type] || p.type },
              { label: 'Capacity', key: 'capacity', width: 12 },
              { label: 'Address', key: 'address', width: 30 },
              { label: 'Contact Person', key: 'contactPerson' },
              { label: 'Contact Phone', key: 'contactPhone', width: 16 },
              { label: 'Notes', key: 'notes', width: 30 },
            ], filteredPlaces, { title: 'Accommodation Places', sheetName: 'Places' })} disabled={filteredPlaces.length === 0}>
              📥 Export
            </button>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(!showForm); }}>
              {showForm && !editing ? '✕ Close' : '+ Add Place'}
            </button>
          </>
        ) : (
          <button className="btn btn-export" onClick={() => exportExcel('accommodation-guests.xlsx', [
            { label: 'Guest Name', key: (g) => `${g.firstName || ''} ${g.lastName || ''}`.trim(), width: 22 },
            { label: 'Event', key: 'eventName', width: 20 },
            { label: 'Phone', key: 'phone', width: 16 },
            { label: 'Adults', key: 'adultsCount', width: 10 },
            { label: 'Kids', key: 'kidsCount', width: 10 },
            { label: 'From', key: 'accommodationFromDate', width: 14 },
            { label: 'To', key: 'accommodationToDate', width: 14 },
            { label: 'Place', key: 'accommodationPlaceName', width: 22 },
            { label: 'Helper', key: 'accommodationHelperName', width: 20 },
          ], filteredGuests, { title: 'Accommodation Guest Assignments', sheetName: 'Guest Assignments' })} disabled={filteredGuests.length === 0}>
            📥 Export
          </button>
        )}
      </div>

      {/* ==================== PLACES TAB ==================== */}
      {tab === 'places' && (
        <>
          {filteredPlaces.length === 0 ? (
            <div className="guests-empty">
              <div className="guests-empty-icon">{places.length === 0 ? '🏠' : '🔍'}</div>
              <h3>{places.length === 0 ? 'No places yet' : 'No results found'}</h3>
              <p className="muted">
                {places.length === 0
                  ? 'Add your first accommodation place using the button above.'
                  : 'Try adjusting your search.'}
              </p>
            </div>
          ) : (
            <div className="guest-table-wrap">
              <table className="guest-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Place</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Occupancy</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPlaces.map((p, idx) => {
                    const filled = filledByPlace[p.id] || 0;
                    const remaining = (p.capacity || 0) - filled;
                    const pct = p.capacity > 0 ? Math.round((filled / p.capacity) * 100) : 0;
                    const assigned = guestsForPlace(p.id);
                    return (
                      <React.Fragment key={p.id}>
                      <tr
                        className={`guest-row-clickable ${selectedPlaceId === p.id ? 'guest-row-selected' : ''}`}
                        onClick={() => setSelectedPlaceId(selectedPlaceId === p.id ? null : p.id)}
                      >
                        <td className="guest-row-num">{(page - 1) * pageSize + idx + 1}</td>
                        <td>
                          <div className="guest-name-cell">
                            <div className="guest-avatar" style={{ background: 'linear-gradient(135deg, #0984e3, #6c5ce7)' }}>
                              {TYPE_ICONS[p.type] || '🏠'}
                            </div>
                            <div>
                              <strong className="guest-name">{p.name}</strong>
                              {p.address && <span className="guest-email">📍 {p.address}</span>}
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-type-colleague" style={{ whiteSpace: 'nowrap' }}>{TYPE_ICONS[p.type] || '🏘️'} {typeLabel(p.type)}</span></td>
                        <td>
                          <div style={{ minWidth: 120 }}>
                            <div className="accom-bar-wrap" style={{ marginBottom: 4 }}>
                              <div className="accom-bar" style={{ width: `${pct}%`, background: pct > 100 ? 'var(--danger, #e74c3c)' : undefined }} />
                            </div>
                            <span style={{ fontSize: '.78rem', color: 'var(--text-secondary)' }}>
                              <strong>{filled}</strong> / {p.capacity}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${remaining > 0 ? 'badge-type-friend' : remaining < 0 ? 'badge-type-family' : 'badge-type-vip'}`} style={{ whiteSpace: 'nowrap' }}>
                            {remaining > 0 ? `${remaining} available` : remaining < 0 ? `⚠️ Overbooked by ${Math.abs(remaining)}` : 'Full'}
                          </span>
                        </td>
                        <td>
                          {p.contactPerson
                            ? <span className="guest-phone" style={{ whiteSpace: 'nowrap' }}>📞 {p.contactPerson}{p.contactPhone ? ` (${p.contactPhone})` : ''}</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td>
                          <span className={`badge ${p.active !== false ? 'badge-type-friend' : 'badge-type-vip'}`}>
                            {p.active !== false ? '✅ Active' : '⛔ Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); handleEdit(p); }} title="Edit">✏️</button>
                            <button className="btn btn-sm btn-icon btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} title="Delete">🗑️</button>
                          </div>
                        </td>
                      </tr>
                      {selectedPlaceId === p.id && (
                        <tr className="guest-detail-row">
                          <td colSpan="8">
                            <div className="guest-detail-panel">
                              <div className="guest-detail-grid">
                                <div className="guest-detail-section">
                                  <h4>🏠 Place Details</h4>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Name</span>
                                    <span className="guest-detail-value">{p.name}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Type</span>
                                    <span className="guest-detail-value">{typeLabel(p.type)}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Capacity</span>
                                    <span className="guest-detail-value">{p.capacity} people</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Address</span>
                                    <span className="guest-detail-value">{p.address || <em className="muted">Not provided</em>}</span>
                                  </div>
                                </div>
                                <div className="guest-detail-section">
                                  <h4>📞 Contact & Notes</h4>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Contact Person</span>
                                    <span className="guest-detail-value">{p.contactPerson || <em className="muted">—</em>}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Contact Phone</span>
                                    <span className="guest-detail-value">{p.contactPhone || <em className="muted">—</em>}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Notes</span>
                                    <span className="guest-detail-value">{p.notes || <em className="muted">—</em>}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Occupancy</span>
                                    <span className="guest-detail-value">{filled} filled / {remaining} remaining</span>
                                  </div>
                                </div>
                              </div>
                              {(assigned.length > 0 || (guestsAtPlace[p.id] && guestsAtPlace[p.id].length > 0)) && (
                                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                                  <h4 style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                                    👥 {occupancyData ? `Guests Staying on ${filterDate}` : 'Assigned Guests'}
                                  </h4>
                                  {occupancyData && guestsAtPlace[p.id] ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                      {guestsAtPlace[p.id].map((og, oi) => (
                                        <span key={oi} className="badge badge-type-family" style={{ fontSize: '.78rem', padding: '5px 12px' }}>
                                          {og.guestName} ({og.adultsCount + og.kidsCount}p) — {og.eventName}
                                          <span style={{ opacity: 0.7, marginLeft: 6 }}>📅 {og.fromDate} → {og.toDate}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                      {assigned.map((g) => (
                                        <span key={g.id} className="badge badge-type-family" style={{ fontSize: '.78rem', padding: '5px 12px' }}>
                                          {g.firstName} {g.lastName} ({g.adultsCount + g.kidsCount}p) — {g.eventName}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="guest-detail-actions">
                                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleEdit(p); }}>✏️ Edit Place</button>
                                <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>🗑️ Delete</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredPlaces.length > 0 && (
            <Pagination
              page={page}
              totalPages={Math.ceil(filteredPlaces.length / pageSize)}
              totalItems={filteredPlaces.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          )}
        </>
      )}

      {/* ==================== GUESTS TAB ==================== */}
      {tab === 'guests' && (
        <>
          {filteredGuests.length === 0 ? (
            <div className="guests-empty">
              <div className="guests-empty-icon">{allGuests.length === 0 ? '🏠' : '🔍'}</div>
              <h3>{allGuests.length === 0 ? 'No guests need accommodation' : 'No results found'}</h3>
              <p className="muted">
                {allGuests.length === 0
                  ? 'Assign guests to events and enable accommodation to see them here.'
                  : 'Try adjusting your search.'}
              </p>
            </div>
          ) : (
            <div className="guest-table-wrap">
              <table className="guest-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Guest</th>
                    <th>Event</th>
                    <th>Contact</th>
                    <th>Head Count</th>
                    <th>Stay Period</th>
                    <th>Assigned Place</th>
                    <th>Helper</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGuests.map((g, idx) => {
                    const gKey = `${g.eventId}-${g.id}`;
                    return (
                      <React.Fragment key={gKey}>
                      <tr
                        className={`guest-row-clickable ${selectedGuestKey === gKey ? 'guest-row-selected' : ''}`}
                        onClick={() => setSelectedGuestKey(selectedGuestKey === gKey ? null : gKey)}
                      >
                        <td className="guest-row-num">{(page - 1) * pageSize + idx + 1}</td>
                        <td>
                          <div className="guest-name-cell">
                            <div className="guest-avatar">{(g.firstName || '?')[0]}{(g.lastName || '?')[0]}</div>
                            <div>
                              <strong className="guest-name">{g.firstName} {g.lastName}</strong>
                              {g.referencePerson && <span className="guest-email">via {g.referencePerson}</span>}
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-type-friend" style={{ whiteSpace: 'nowrap' }}>🎉 {g.eventName}</span></td>
                        <td>
                          {g.phone
                            ? <span className="guest-phone" style={{ whiteSpace: 'nowrap' }}>📞 {g.phone}</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td><span style={{ whiteSpace: 'nowrap' }}>{g.adultsCount}A / {g.kidsCount}K</span></td>
                        <td>
                          {g.accommodationFromDate
                            ? <span className="guest-location" style={{ whiteSpace: 'nowrap' }}>📅 {g.accommodationFromDate} → {g.accommodationToDate}</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td>
                          {g.accommodationPlaceName
                            ? <span className="badge badge-type-colleague" style={{ whiteSpace: 'nowrap' }}>🏠 {g.accommodationPlaceName}</span>
                            : <span className="badge badge-type-vip" style={{ whiteSpace: 'nowrap' }}>⚠️ Unassigned</span>}
                        </td>
                        <td>
                          {g.accommodationHelperName
                            ? <span style={{ whiteSpace: 'nowrap' }}>🤝 {g.accommodationHelperName}</span>
                            : <span className="muted">—</span>}
                        </td>
                      </tr>
                      {selectedGuestKey === gKey && (
                        <tr className="guest-detail-row">
                          <td colSpan="8">
                            <div className="guest-detail-panel">
                              <div className="guest-detail-grid">
                                <div className="guest-detail-section">
                                  <h4>👤 Guest Info</h4>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Full Name</span>
                                    <span className="guest-detail-value">{g.firstName} {g.lastName}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Phone</span>
                                    <span className="guest-detail-value">{g.phone || <em className="muted">—</em>}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Reference</span>
                                    <span className="guest-detail-value">{g.referencePerson || <em className="muted">—</em>}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Event</span>
                                    <span className="guest-detail-value">{g.eventName}</span>
                                  </div>
                                </div>
                                <div className="guest-detail-section">
                                  <h4>🏠 Accommodation Details</h4>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Head Count</span>
                                    <span className="guest-detail-value">{g.adultsCount} adults + {g.kidsCount} kids = {g.adultsCount + g.kidsCount} people</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">From Date</span>
                                    <span className="guest-detail-value">{g.accommodationFromDate || <em className="muted">—</em>}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">To Date</span>
                                    <span className="guest-detail-value">{g.accommodationToDate || <em className="muted">—</em>}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Assigned Place</span>
                                    <span className="guest-detail-value">{g.accommodationPlaceName || <em className="muted">Unassigned</em>}</span>
                                  </div>
                                  <div className="guest-detail-field">
                                    <span className="guest-detail-label">Helper</span>
                                    <span className="guest-detail-value">{g.accommodationHelperName || <em className="muted">—</em>}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredGuests.length > 0 && (
            <Pagination
              page={page}
              totalPages={Math.ceil(filteredGuests.length / pageSize)}
              totalItems={filteredGuests.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          )}
        </>
      )}
      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete Accommodation Place"
        message="Are you sure you want to delete this place? This action cannot be undone."
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
