import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import SummaryPanel from '../components/SummaryPanel';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import Pagination from '../components/Pagination';
import { exportExcel } from '../utils/exportCsv';

const TYPE_LABELS = { FAMILY: 'Family', FRIEND: 'Friend', VIP: 'VIP', COLLEAGUE: 'Colleague', OTHER: 'Other' };
const PLACE_LABELS = { GUEST_HOUSE: 'Guest House', INDEPENDENT_HOUSE: 'Independent House', HOTEL: 'Hotel', RELATIVE_HOUSE: 'Relative House', HOSTEL: 'Hostel', OTHER: 'Other' };

const MEAL_EMPTY = { mealDate: '', breakfast: false, lunch: false, snack: false, dinner: false };
const SCHED_EMPTY = { title: '', scheduleDate: '', startTime: '', endTime: '', description: '' };

const EG_EMPTY = {
  guestId: '', adultsCount: 1, kidsCount: 0,
  needsTransport: false, pickupLocation: '', dropOffLocation: '', pickupDate: '', pickupTime: '', transportPeopleCount: 0,
  transportStartDate: '', transportEndDate: '',
  pickupTaskComplete: false, dropTaskComplete: false,
  needsAccommodation: false, accommodationFromDate: '', accommodationToDate: '',
  accommodationPlaceId: '', accommodationPlaceName: '',
  accommodationTaskComplete: false,
  attended: false,
  invitationStatus: 'PENDING', invitationNotes: '',
  transportHelperId: '', transportHelperName: '',
  accommodationHelperId: '', accommodationHelperName: '',
  cookingHelperId: '', cookingHelperName: '',
  servingHelperId: '', servingHelperName: '',
};

export default function EventDetail() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [event, setEvent] = useState(null);
  const [eventGuests, setEventGuests] = useState([]);
  const [allGuests, setAllGuests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [accommodationPlaces, setAccommodationPlaces] = useState([]);
  const [dropOffLocations, setDropOffLocations] = useState([]);
  const [placeAvailability, setPlaceAvailability] = useState({}); // { placeId: { filled, capacity } }
  const [editingEg, setEditingEg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('guests');
  const [egForm, setEgForm] = useState(EG_EMPTY);

  // Schedule form
  const [schedForm, setSchedForm] = useState(SCHED_EMPTY);
  const [editingSched, setEditingSched] = useState(null);
  const [showSchedForm, setShowSchedForm] = useState(false);

  // Meal form
  const [mealEgId, setMealEgId] = useState(null);
  const [mealForm, setMealForm] = useState(MEAL_EMPTY);
  const [mealsByEg, setMealsByEg] = useState({});
  const [editingMeal, setEditingMeal] = useState(null);
  const [mealSummary, setMealSummary] = useState([]);
  const [mealSubTab, setMealSubTab] = useState('overview'); // 'overview' | 'manage'
  const [expandedMealDate, setExpandedMealDate] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedEgId, setSelectedEgId] = useState(null);

  // Guest tab search & pagination
  const [guestSearch, setGuestSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [guestPage, setGuestPage] = useState(1);
  const [guestPageSize, setGuestPageSize] = useState(10);

  const load = useCallback(async () => {
    try {
      const [ev, s, h, sc, ap, ag, dol] = await Promise.all([
        api.getEvent(id),
        api.getEventSummary(id),
        api.getHelpers(),
        api.getSchedules(id),
        api.getAccommodationPlaces(),
        api.getAllGuests(),
        api.getDropOffLocations(),
      ]);
      setEvent(ev);
      setEventGuests(ev?.eventGuests || []);
      setSummary(s);
      setHelpers(h);
      setSchedules(sc);
      setDropOffLocations(dol || []);
      setAccommodationPlaces(ap || []);
      setAllGuests(ag);
    } catch (err) { addToast(err.message); }
  }, [id, addToast]);

  useEffect(() => { load(); }, [load]);

  // Fetch place availability when accommodation dates change
  useEffect(() => {
    if (egForm.needsAccommodation && egForm.accommodationFromDate && egForm.accommodationToDate) {
      api.getAccommodationOccupancy(egForm.accommodationFromDate, egForm.accommodationToDate)
        .then((data) => {
          const avail = {};
          for (const o of (data || [])) {
            avail[o.placeId] = { filled: o.filled, capacity: o.capacity };
          }
          setPlaceAvailability(avail);
        })
        .catch(() => {});
    } else {
      setPlaceAvailability({});
    }
  }, [egForm.needsAccommodation, egForm.accommodationFromDate, egForm.accommodationToDate]);

  // Helpers
  const helpersByCategory = (cat) => helpers.filter((h) => h.active !== false && (
    (h.categories ? h.categories.split(',').map(c => c.trim()) : [h.category]).includes(cat)
  ));
  const setField = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked
              : e.target.type === 'number' ? Number(e.target.value)
              : e.target.value;
    setEgForm((prev) => ({ ...prev, [field]: val }));
  };
  const setHelper = (idField, nameField) => (e) => {
    const hid = String(e.target.value);
    const helper = helpers.find((h) => String(h.id) === hid);
    setEgForm((prev) => ({ ...prev, [idField]: hid ? Number(hid) : '', [nameField]: helper ? `${helper.firstName} ${helper.lastName}` : '' }));
  };
  const setPlace = (e) => {
    const pid = String(e.target.value);
    const place = accommodationPlaces.find((p) => String(p.id) === pid);
    setEgForm((prev) => ({ ...prev, accommodationPlaceId: pid ? Number(pid) : '', accommodationPlaceName: place ? place.name : '' }));
  };

  const dateMin = event?.date ? (() => { const d = new Date(event.date); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })() : undefined;
  const dateMax = event?.date ? (() => { const d = new Date(event.date); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })() : undefined;

  // Already-assigned guest IDs (to filter dropdown)
  const assignedGuestIds = new Set(eventGuests.map((eg) => eg.guest?.id));

  const startAssign = () => {
    setEditingEg(null);
    setEgForm(EG_EMPTY);
    setShowForm(true);
  };
  const startEdit = (eg) => {
    setEditingEg(eg);
    setEgForm({
      guestId: eg.guest?.id || '',
      adultsCount: eg.adultsCount || 1, kidsCount: eg.kidsCount || 0,
      needsTransport: eg.needsTransport || false, pickupLocation: eg.pickupLocation || '',
      dropOffLocation: eg.dropOffLocation || '',
      pickupDate: eg.pickupDate || '', pickupTime: eg.pickupTime || '',
      transportPeopleCount: eg.transportPeopleCount || 0,
      transportStartDate: eg.transportStartDate || '',
      transportEndDate: eg.transportEndDate || '',
      pickupTaskComplete: eg.pickupTaskComplete || false,
      dropTaskComplete: eg.dropTaskComplete || false,
      needsAccommodation: eg.needsAccommodation || false,
      accommodationFromDate: eg.accommodationFromDate || '', accommodationToDate: eg.accommodationToDate || '',
      accommodationPlaceId: eg.accommodationPlaceId || '', accommodationPlaceName: eg.accommodationPlaceName || '',
      accommodationTaskComplete: eg.accommodationTaskComplete || false,
      attended: eg.attended || false,
      invitationStatus: eg.invitationStatus || 'PENDING',
      invitationNotes: eg.invitationNotes || '',
      transportHelperId: eg.transportHelperId || '', transportHelperName: eg.transportHelperName || '',
      accommodationHelperId: eg.accommodationHelperId || '', accommodationHelperName: eg.accommodationHelperName || '',
      cookingHelperId: eg.cookingHelperId || '', cookingHelperName: eg.cookingHelperName || '',
      servingHelperId: eg.servingHelperId || '', servingHelperName: eg.servingHelperName || '',
    });
    setShowForm(true);
  };

  const handleSaveEg = async (e) => {
    e.preventDefault();
    try {
      if (editingEg) {
        await api.updateEventGuest(id, editingEg.id, egForm);
      } else {
        await api.assignGuest(id, egForm);
      }
      setEditingEg(null);
      setShowForm(false);
      setEgForm(EG_EMPTY);
      addToast(editingEg ? 'Guest updated' : 'Guest assigned', 'success');
      load();
    } catch (err) { addToast(err.message); }
  };

  const handleRemoveEg = (egId) => setConfirmDelete({ type: 'guest', id: egId });
  const handleDeleteSched = (schedId) => setConfirmDelete({ type: 'schedule', id: schedId });
  const handleDeleteMeal = (egId, mealId) => setConfirmDelete({ type: 'meal', egId, id: mealId });

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'guest') {
        await api.removeEventGuest(id, confirmDelete.id);
        load();
      } else if (confirmDelete.type === 'schedule') {
        await api.deleteSchedule(id, confirmDelete.id);
        load();
      } else if (confirmDelete.type === 'meal') {
        await api.deleteMeal(id, confirmDelete.egId, confirmDelete.id);
        loadMeals(confirmDelete.egId);
        loadMealSummary();
      }
      addToast('Deleted successfully', 'success');
    } catch (err) { addToast(err.message); }
    setConfirmDelete(null);
  };

  // Load meals for an event-guest
  const loadMeals = async (egId) => {
    try {
      const meals = await api.getMeals(id, egId);
      setMealsByEg((prev) => ({ ...prev, [egId]: meals }));
    } catch (err) { addToast(err.message); }
  };

  const loadMealSummary = async () => {
    try {
      const data = await api.getMealSummary(id);
      setMealSummary(data || []);
    } catch (err) { addToast(err.message); }
  };

  // Schedule handlers
  const handleSaveSched = async (e) => {
    e.preventDefault();
    try {
      if (editingSched) {
        await api.updateSchedule(id, editingSched.id, schedForm);
      } else {
        await api.createSchedule(id, schedForm);
      }
      setSchedForm(SCHED_EMPTY);
      setEditingSched(null);
      setShowSchedForm(false);
      addToast(editingSched ? 'Schedule updated' : 'Schedule added', 'success');
      load();
    } catch (err) { addToast(err.message); }
  };

  // Meal handlers
  const handleSaveMeal = async (e) => {
    e.preventDefault();
    try {
      if (editingMeal) {
        await api.updateMeal(id, mealEgId, editingMeal.id, mealForm);
      } else {
        await api.createMeal(id, mealEgId, mealForm);
      }
      setMealForm(MEAL_EMPTY);
      setEditingMeal(null);
      addToast(editingMeal ? 'Meal updated' : 'Meal added', 'success');
      loadMeals(mealEgId);
      loadMealSummary();
    } catch (err) { addToast(err.message); }
  };

  if (!event) return <p>Loading...</p>;

  return (
    <div>
      <Link to="/events" className="back-link">Back to Events</Link>
      <h1>{event.name}</h1>
      <p className="muted">{event.date}{event.time ? ` · ⏰ ${event.time}` : ''} {event.description && `— ${event.description}`}</p>

      {summary && <SummaryPanel summary={summary} />}

      {/* TABS */}
      <div className="tabs">
        <button className={`tab ${tab === 'guests' ? 'active' : ''}`} onClick={() => setTab('guests')}>Guests</button>
        <button className={`tab ${tab === 'meals' ? 'active' : ''}`} onClick={() => { setTab('meals'); loadMealSummary(); }}>Food / Meals</button>
        <button className={`tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>Hall Schedule</button>
      </div>

      {/* ==================== GUESTS TAB ==================== */}
      {tab === 'guests' && (
        <>

          {(showForm || editingEg) && (
          <div className="card">
            <div className="card-toggle-header" onClick={() => { if (!editingEg) setShowForm(false); }}>
              <h2>{editingEg ? '✏️ Edit Assignment' : '🆕 Assign Guest to Event'}</h2>
              <span className={`toggle-icon open`}>&#9660;</span>
            </div>
            {showForm && (
              <form onSubmit={handleSaveEg} className="guest-form" style={{ marginTop: 12 }}>
                {/* Guest selector */}
                <fieldset>
                  <legend>Select Guest</legend>
                  <div className="form-row">
                    <label><span>Guest</span>
                      <CustomSelect
                        value={egForm.guestId}
                        onChange={setField('guestId')}
                        options={allGuests
                          .filter((g) => editingEg ? g.id === egForm.guestId : !assignedGuestIds.has(g.id))
                          .map((g) => ({ value: g.id, label: `${g.firstName} ${g.lastName} (${TYPE_LABELS[g.guestType] || g.guestType})` }))}
                        placeholder="-- Search or choose a guest --"
                        searchable
                        required
                      />
                    </label>
                  </div>
                  {!editingEg && allGuests.filter((g) => !assignedGuestIds.has(g.id)).length === 0 && (
                    <p className="muted">All guests are already assigned. <Link to="/guests">Add more guests</Link> first.</p>
                  )}
                </fieldset>

                {/* Head Count */}
                <fieldset>
                  <legend>Head Count</legend>
                  <div className="form-row">
                    <label>Adults <input type="number" min="0" value={egForm.adultsCount} onChange={setField('adultsCount')} /></label>
                    <label>Kids <input type="number" min="0" value={egForm.kidsCount} onChange={setField('kidsCount')} /></label>
                  </div>
                </fieldset>

                {/* Invitation */}
                <fieldset>
                  <legend>📞 Invitation</legend>
                  <div className="form-row">
                    <label><span>Status</span>
                      <select value={egForm.invitationStatus} onChange={setField('invitationStatus')} className="form-control">
                        <option value="PENDING">⏳ Pending — Not yet called</option>
                        <option value="CALLED">✅ Called — Reached &amp; confirmed</option>
                        <option value="NO_ANSWER">📵 No Answer — Will try again</option>
                        <option value="DECLINED">🚫 Declined — Cannot attend</option>
                      </select>
                    </label>
                    <label><span>Notes</span>
                      <textarea
                        rows={2}
                        value={egForm.invitationNotes}
                        onChange={setField('invitationNotes')}
                        placeholder="e.g. Called twice, no answer. Try again on Monday."
                        style={{ resize: 'vertical', minHeight: 60 }}
                      />
                    </label>
                  </div>
                </fieldset>

                {/* Transport */}
                <fieldset>
                  <legend>Transportation</legend>
                  <label className="check-label">
                    <input type="checkbox" checked={egForm.needsTransport} onChange={setField('needsTransport')} /> Needs Transport
                  </label>
                  {egForm.needsTransport && (
                    <>
                    <div className="form-row">
                      <label>Pickup Location
                        <select value={egForm.pickupLocation} onChange={setField('pickupLocation')} className="form-control">
                          <option value="">— Select location —</option>
                          {dropOffLocations.map(loc => (
                            <option key={loc.id} value={loc.name}>{loc.name}{loc.address ? ` (${loc.address})` : ''}</option>
                          ))}
                        </select>
                      </label>
                      <label>Drop-off Location
                        <select value={egForm.dropOffLocation} onChange={setField('dropOffLocation')} className="form-control">
                          <option value="">— Select location —</option>
                          {egForm.accommodationPlaceName && (
                            <option value={egForm.accommodationPlaceName}>🏠 {egForm.accommodationPlaceName} (Accommodation)</option>
                          )}
                          {dropOffLocations.filter(loc => loc.name !== egForm.accommodationPlaceName).map(loc => (
                            <option key={loc.id} value={loc.name}>{loc.name}{loc.address ? ` (${loc.address})` : ''}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-row">
                      <label>Pickup Date
                        <CustomDatePicker
                          value={egForm.pickupDate}
                          onChange={setField('pickupDate')}
                          name="pickupDate"
                          min={dateMin}
                          max={dateMax}
                        />
                        <span className="phone-hint">±7 days from event date</span>
                      </label>
                      <label>Pickup Time <input type="time" value={egForm.pickupTime} onChange={setField('pickupTime')} /></label>
                    </div>
                    <div className="form-row">
                      <label><span>Transport Start Date</span><CustomDatePicker value={egForm.transportStartDate} onChange={setField('transportStartDate')} name="transportStartDate" min={dateMin} max={dateMax} /><span className="phone-hint">±7 days from event date</span></label>
                      <label><span>Transport End Date</span><CustomDatePicker value={egForm.transportEndDate} onChange={setField('transportEndDate')} name="transportEndDate" min={dateMin} max={dateMax} /><span className="phone-hint">±7 days from event date</span></label>
                    </div>
                    <div className="form-row">
                      <label>
                        Total People Count
                        <input
                          type="number"
                          min="0"
                          value={egForm.transportPeopleCount || (egForm.adultsCount + egForm.kidsCount)}
                          onChange={setField('transportPeopleCount')}
                          placeholder={`Default: ${egForm.adultsCount + egForm.kidsCount} (adults + kids)`}
                        />
                        <span className="phone-hint">Suggested: {egForm.adultsCount + egForm.kidsCount} (adults + kids)</span>
                      </label>
                    </div>
                    <div className="form-row" style={{ gap: 24 }}>
                      <label className="check-label">
                        <input type="checkbox" checked={egForm.pickupTaskComplete} onChange={setField('pickupTaskComplete')} />
                        <span style={{ marginLeft: 6 }}>✅ Pickup Complete</span>
                      </label>
                      <label className="check-label">
                        <input type="checkbox" checked={egForm.dropTaskComplete} onChange={setField('dropTaskComplete')} />
                        <span style={{ marginLeft: 6 }}>✅ Drop Complete</span>
                      </label>
                    </div>
                    </>
                  )}
                </fieldset>

                {/* Accommodation */}
                <fieldset>
                  <legend>Accommodation</legend>
                  <label className="check-label">
                    <input type="checkbox" checked={egForm.needsAccommodation} onChange={setField('needsAccommodation')} /> Needs Accommodation
                  </label>
                  {egForm.needsAccommodation && (
                    <div className="form-row">
                      <label><span>From Date <span className="required">*</span></span><CustomDatePicker value={egForm.accommodationFromDate} onChange={setField('accommodationFromDate')} name="accommodationFromDate" min={dateMin} max={dateMax} required /><span className="phone-hint">±7 days from event date</span></label>
                      <label>
                        <span>To Date <span className="required">*</span></span>
                        <CustomDatePicker
                          value={egForm.accommodationToDate}
                          onChange={setField('accommodationToDate')}
                          name="accommodationToDate"
                          min={egForm.accommodationFromDate || dateMin}
                          max={dateMax}
                          required
                        />
                        <span className="phone-hint">±7 days from event date</span>
                        {egForm.accommodationFromDate && egForm.accommodationToDate && egForm.accommodationToDate < egForm.accommodationFromDate && (
                          <span className="phone-hint" style={{ color: 'var(--danger)' }}>To date must be on or after From date</span>
                        )}
                      </label>
                      <label><span>Place <span className="required">*</span></span>
                        <CustomSelect
                          value={egForm.accommodationPlaceId || ''}
                          onChange={setPlace}
                          options={accommodationPlaces.filter((p) => p.active !== false).map((p) => {
                            const a = placeAvailability[p.id];
                            const avail = a ? a.capacity - a.filled : null;
                            const tag = a ? (avail < 0 ? ` — ⚠️ Overbooked by ${Math.abs(avail)}` : ` — ${avail} of ${a.capacity} available`) : '';
                            const full = a && avail <= 0;
                            return { value: p.id, label: `${p.name} (${PLACE_LABELS[p.type] || p.type.replace(/_/g, ' ')})${tag}`, disabled: full };
                          })}
                          placeholder="Select place"
                          required
                        />
                      </label>
                      <label className="check-label" style={{ alignSelf: 'flex-end', paddingBottom: 8 }}>
                        <input type="checkbox" checked={egForm.accommodationTaskComplete} onChange={setField('accommodationTaskComplete')} />
                        <span style={{ marginLeft: 6 }}>✅ Accommodation Complete</span>
                      </label>
                    </div>
                  )}
                </fieldset>

                {/* Helpers */}
                <fieldset>
                  <legend>Assigned Helpers (Incharges)</legend>
                  <div className="form-row">
                    <label>Transport Helper
                      <CustomSelect
                        value={egForm.transportHelperId || ''}
                        onChange={setHelper('transportHelperId', 'transportHelperName')}
                        options={helpersByCategory('TRANSPORT').map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName}` }))}
                        placeholder="None"
                      />
                    </label>
                    <label>Accommodation Helper
                      <CustomSelect
                        value={egForm.accommodationHelperId || ''}
                        onChange={setHelper('accommodationHelperId', 'accommodationHelperName')}
                        options={helpersByCategory('ACCOMMODATION').map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName}` }))}
                        placeholder="None"
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>Cooking Helper
                      <CustomSelect
                        value={egForm.cookingHelperId || ''}
                        onChange={setHelper('cookingHelperId', 'cookingHelperName')}
                        options={helpersByCategory('COOKING').map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName}` }))}
                        placeholder="None"
                      />
                    </label>
                    <label>Serving Helper
                      <CustomSelect
                        value={egForm.servingHelperId || ''}
                        onChange={setHelper('servingHelperId', 'servingHelperName')}
                        options={helpersByCategory('SERVING').map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName}` }))}
                        placeholder="None"
                      />
                    </label>
                  </div>
                </fieldset>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">{editingEg ? 'Update' : 'Assign'}</button>
                  <button type="button" className="btn" onClick={() => { setEditingEg(null); setShowForm(false); setEgForm(EG_EMPTY); }}>Cancel</button>
                  <label className="check-label" style={{ marginLeft: 'auto' }}>
                    <input type="checkbox" checked={egForm.attended} onChange={setField('attended')} />
                    <span style={{ marginLeft: 6 }}>🎟️ Attended</span>
                  </label>
                </div>
              </form>
            )}
          </div>
          )}

          <h2>Guest List ({eventGuests.length})</h2>
          {eventGuests.length === 0 && <p className="muted">No guests assigned yet. Click "+ Assign Guest" to get started.</p>}

          {(() => {
            const q = guestSearch.toLowerCase();
            const filtered = eventGuests.filter((eg) => {
              const g = eg.guest || {};
              const matchesText = !q || `${g.firstName} ${g.lastName} ${g.phone || ''} ${g.email || ''} ${g.guestType || ''} ${g.village || ''} ${g.district || ''} ${g.state || ''} ${g.referencePerson || ''}`.toLowerCase().includes(q);
              const matchesStatus = !statusFilter || (eg.invitationStatus || 'PENDING') === statusFilter;
              return matchesText && matchesStatus;
            });
            const totalPages = Math.ceil(filtered.length / guestPageSize);
            const paginated = filtered.slice((guestPage - 1) * guestPageSize, guestPage * guestPageSize);
            return (
            <>
            <div className="guests-toolbar">
              <div className="guests-search-wrap">
                <span className="guests-search-icon">🔍</span>
                <input
                  className="guests-search-input"
                  placeholder="Search by name, phone, location, type..."
                  value={guestSearch}
                  onChange={(e) => { setGuestSearch(e.target.value); setGuestPage(1); }}
                />
                {guestSearch && (
                  <button className="guests-search-clear" onClick={() => setGuestSearch('')}>✕</button>
                )}
              </div>
              <span className="guests-count-badge">
                {filtered.length} of {eventGuests.length} guest{eventGuests.length !== 1 ? 's' : ''}
              </span>
              {!showForm && !editingEg && (
                <button className="btn btn-primary" onClick={startAssign}>+ Assign Guest</button>
              )}
              {eventGuests.length > 0 && (
                <button className="btn btn-export" style={{ marginLeft: 'auto' }} onClick={() => {
                  const cols = [
                    { label: '#', key: (_, i) => i + 1, width: 6 },
                    { label: 'First Name', key: r => r.guest?.firstName || '', width: 16 },
                    { label: 'Last Name', key: r => r.guest?.lastName || '', width: 16 },
                    { label: 'Phone', key: r => r.guest?.phone || '', width: 14 },
                    { label: 'Email', key: r => r.guest?.email || '', width: 22 },
                    { label: 'Type', key: r => r.guest?.guestType || '', width: 12 },
                    { label: 'Reference', key: r => r.guest?.referencePerson || '', width: 16 },
                    { label: 'Adults', key: 'adultsCount', width: 9 },
                    { label: 'Kids', key: 'kidsCount', width: 8 },
                    { label: 'Transport', key: r => r.needsTransport ? 'Yes' : 'No', width: 10 },
                    { label: 'Pickup Location', key: 'pickupLocation', width: 18 },
                    { label: 'Drop-off Location', key: 'dropOffLocation', width: 18 },
                    { label: 'Pickup Date', key: 'pickupDate', width: 14 },
                    { label: 'Pickup Time', key: 'pickupTime', width: 12 },
                    { label: 'Accommodation', key: r => r.needsAccommodation ? 'Yes' : 'No', width: 14 },
                    { label: 'Acc. Place', key: 'accommodationPlaceName', width: 18 },
                    { label: 'Acc. From', key: 'accommodationFromDate', width: 14 },
                    { label: 'Acc. To', key: 'accommodationToDate', width: 14 },
                    { label: 'Village', key: r => r.guest?.village || '', width: 14 },
                    { label: 'District', key: r => r.guest?.district || '', width: 14 },
                    { label: 'State', key: r => r.guest?.state || '', width: 14 },
                    { label: 'Attended', key: r => r.attended ? 'Yes' : 'No', width: 10 },
                    { label: 'Invite Status', key: r => r.invitationStatus || 'PENDING', width: 14 },
                    { label: 'Invite Notes', key: r => r.invitationNotes || '', width: 24 },
                    { label: 'Pickup Done', key: r => r.pickupTaskComplete ? 'Yes' : 'No', width: 12 },
                    { label: 'Drop Done', key: r => r.dropTaskComplete ? 'Yes' : 'No', width: 12 },
                  ];
                  const name = (event?.name || 'event').replace(/[^a-zA-Z0-9]/g, '_');
                  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                  const filterNote = statusFilter ? ` (${statusFilter})` : (q ? ' (filtered)' : '');
                  exportExcel(`CelebrateHub_${name}_${today}.xlsx`, cols, filtered, {
                    sheetName: 'Guests',
                    title: `${event?.name || 'Event'} — Guest List${filterNote}`,
                  });
                }}>📥 Export ({filtered.length})</button>
              )}
            </div>

            {/* Invitation status filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 4px' }}>
              {[{ value: '', label: 'All' }, { value: 'PENDING', label: '⏳ Pending' }, { value: 'CALLED', label: '✅ Called' }, { value: 'NO_ANSWER', label: '📵 No Answer' }, { value: 'DECLINED', label: '🚫 Declined' }].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className="btn btn-sm"
                  style={{ fontWeight: statusFilter === value ? 700 : 400, background: statusFilter === value ? 'var(--primary-bg)' : 'var(--surface)', color: statusFilter === value ? 'var(--primary)' : 'var(--text-muted)', border: `1.5px solid ${statusFilter === value ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 20, padding: '3px 12px' }}
                  onClick={() => { setStatusFilter(value); setGuestPage(1); }}
                >{label}</button>
              ))}
            </div>
          <div className="guest-table-wrap">
            <table className="guest-table">
              <colgroup>
                <col style={{ width: 36 }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Adults / Kids</th>
                  <th>Transport</th>
                  <th>Accommodation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((eg, idx) => {
                  const g = eg.guest || {};
                  const isExpanded = selectedEgId === eg.id;
                  return (
                    <React.Fragment key={eg.id}>
                    <tr
                      className={`guest-row-clickable ${isExpanded ? 'guest-row-selected' : ''}`}
                      onClick={() => setSelectedEgId(isExpanded ? null : eg.id)}
                    >
                      <td className="guest-row-num">{(guestPage - 1) * guestPageSize + idx + 1}</td>
                      <td>
                        <div className="guest-name-cell">
                          <div className="guest-avatar">{(g.firstName || '?')[0]}{(g.lastName || '?')[0]}</div>
                          <div>
                            <strong className="guest-name">{g.firstName} {g.lastName}</strong>
                            {g.referencePerson && <span className="guest-email">via {g.referencePerson}</span>}
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge badge-type-${(g.guestType || '').toLowerCase()}`}>{TYPE_LABELS[g.guestType] || g.guestType || '—'}</span></td>
                      <td>
                        {g.phone ? <span>📞 {g.phone}</span> : <span className="muted">—</span>}
                        {(() => {
                          const st = eg.invitationStatus || 'PENDING';
                          const badges = { CALLED: ['✅','var(--success,#16a34a)','var(--success-bg,#f0fdf4)'], NO_ANSWER: ['📵','#b45309','#fffbeb'], DECLINED: ['🚫','var(--danger)','var(--danger-bg,#fef2f2)'], PENDING: ['⏳','var(--text-muted)','var(--surface)'] };
                          const [icon, color, bg] = badges[st] || badges.PENDING;
                          return <span style={{ display: 'inline-block', marginLeft: 6, fontSize: '.72rem', background: bg, color, border: `1px solid ${color}`, borderRadius: 4, padding: '1px 5px' }}>{icon}</span>;
                        })()}
                      </td>
                      <td>{[g.village, g.district, g.state].filter(Boolean).length > 0 ? <span>📍 {[g.village, g.district, g.state].filter(Boolean).join(', ')}</span> : <span className="muted">—</span>}</td>
                      <td>{eg.adultsCount}A / {eg.kidsCount}K</td>
                      <td>
                        {eg.needsTransport
                          ? <span className="badge" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>✓ Yes</span>
                          : <span className="muted">No</span>}
                      </td>
                      <td>
                        {eg.needsAccommodation
                          ? <span className="badge" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>✓ Yes</span>
                          : <span className="muted">No</span>}
                      </td>
                      <td>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); startEdit(eg); }} title="Edit">✏️</button>
                          <button className="btn btn-sm btn-icon btn-danger" onClick={(e) => { e.stopPropagation(); handleRemoveEg(eg.id); }} title="Remove">🗑️</button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="guest-detail-row">
                        <td colSpan="9">
                          <div className="guest-detail-panel">
                            <div className="guest-detail-grid">
                              {/* ── Row 1: three small sections ── */}
                              <div className="guest-detail-section">
                                <h4>👥 Head Count</h4>
                                <div className="guest-detail-field"><span className="guest-detail-label">Adults</span><span className="guest-detail-value">{eg.adultsCount}</span></div>
                                <div className="guest-detail-field"><span className="guest-detail-label">Kids</span><span className="guest-detail-value">{eg.kidsCount}</span></div>
                                <div className="guest-detail-field"><span className="guest-detail-label">Total</span><span className="guest-detail-value"><strong>{eg.adultsCount + eg.kidsCount}</strong></span></div>
                              </div>
                              <div className="guest-detail-section">
                                <h4>📞 Invitation</h4>
                                <div className="guest-detail-field"><span className="guest-detail-label">Status</span><span className="guest-detail-value">{{
                                  CALLED: '✅ Called — Confirmed', NO_ANSWER: '📵 No Answer — Try again',
                                  DECLINED: '🚫 Declined', PENDING: '⏳ Pending'
                                }[eg.invitationStatus || 'PENDING'] || eg.invitationStatus}</span></div>
                                {eg.invitationNotes && <div className="guest-detail-field"><span className="guest-detail-label">Notes</span><span className="guest-detail-value" style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{eg.invitationNotes}</span></div>}
                              </div>
                              <div className="guest-detail-section">
                                <h4>🍽️ Helpers &amp; Attendance</h4>
                                <div className="guest-detail-field"><span className="guest-detail-label">Cooking</span><span className="guest-detail-value">{eg.cookingHelperName || <em className="muted">—</em>}</span></div>
                                <div className="guest-detail-field"><span className="guest-detail-label">Serving</span><span className="guest-detail-value">{eg.servingHelperName || <em className="muted">—</em>}</span></div>
                                <div className="guest-detail-field"><span className="guest-detail-label">🎟️ Attended</span><span className="guest-detail-value">{eg.attended ? '✅ Yes' : '—'}</span></div>
                              </div>

                              {/* ── Row 2: Transport (wide) + Accommodation ── */}
                              <div className="guest-detail-section guest-detail-section--wide">
                                <h4>🚗 Transport</h4>
                                {eg.needsTransport ? (
                                  <div className="guest-detail-fields-2col">
                                    <div className="guest-detail-field"><span className="guest-detail-label">Pickup Location</span><span className="guest-detail-value">{eg.pickupLocation || <em className="muted">Not set</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Drop-off Location</span><span className="guest-detail-value">{eg.dropOffLocation || <em className="muted">Not set</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Pickup Date</span><span className="guest-detail-value">{eg.pickupDate || <em className="muted">Not set</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Pickup Time</span><span className="guest-detail-value">{eg.pickupTime || <em className="muted">Not set</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Start Date</span><span className="guest-detail-value">{eg.transportStartDate || <em className="muted">—</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">End Date</span><span className="guest-detail-value">{eg.transportEndDate || <em className="muted">—</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">People Count</span><span className="guest-detail-value">{eg.transportPeopleCount}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Helper</span><span className="guest-detail-value">{eg.transportHelperName || <em className="muted">Not assigned</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Pickup Task</span><span className="guest-detail-value">{eg.pickupTaskComplete ? '✅ Done' : '⏳ Pending'}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Drop Task</span><span className="guest-detail-value">{eg.dropTaskComplete ? '✅ Done' : '⏳ Pending'}</span></div>
                                  </div>
                                ) : <p className="muted" style={{ fontSize: '.85rem' }}>Not required</p>}
                              </div>
                              <div className="guest-detail-section">
                                <h4>🏨 Accommodation</h4>
                                {eg.needsAccommodation ? (
                                  <>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Place</span><span className="guest-detail-value">{eg.accommodationPlaceName || <em className="muted">TBD</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">From</span><span className="guest-detail-value">{eg.accommodationFromDate || <em className="muted">Not set</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">To</span><span className="guest-detail-value">{eg.accommodationToDate || <em className="muted">Not set</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Helper</span><span className="guest-detail-value">{eg.accommodationHelperName || <em className="muted">Not assigned</em>}</span></div>
                                    <div className="guest-detail-field"><span className="guest-detail-label">Task</span><span className="guest-detail-value">{eg.accommodationTaskComplete ? '✅ Done' : '⏳ Pending'}</span></div>
                                  </>
                                ) : <p className="muted" style={{ fontSize: '.85rem' }}>Not required</p>}
                              </div>
                            </div>
                            <div className="guest-detail-actions">
                              <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); startEdit(eg); }}>✏️ Edit</button>
                              <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleRemoveEg(eg.id); }}>🗑️ Remove</button>
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
              {filtered.length > 0 && (
                <Pagination
                  page={guestPage}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  pageSize={guestPageSize}
                  onPageChange={setGuestPage}
                  onPageSizeChange={(s) => { setGuestPageSize(s); setGuestPage(1); }}
                />
              )}
              </>
            );
          })()}
        </>
      )}

      {/* ==================== MEALS TAB ==================== */}
      {tab === 'meals' && (
        <>
          <div className="page-header">
            <h2>🍽️ Food / Meals</h2>
            <p className="muted">Track meal requirements by date and guest</p>
          </div>

          {/* Sub-tabs */}
          <div className="tabs" style={{ marginBottom: 20 }}>
            <button className={`tab ${mealSubTab === 'overview' ? 'active' : ''}`} onClick={() => { setMealSubTab('overview'); loadMealSummary(); }}>
              📊 Overview by Date
            </button>
            <button className={`tab ${mealSubTab === 'manage' ? 'active' : ''}`} onClick={() => setMealSubTab('manage')}>
              ✏️ Manage by Guest
            </button>
          </div>

          {/* ========== OVERVIEW SUB-TAB ========== */}
          {mealSubTab === 'overview' && (
            <>
              {mealSummary.length === 0 ? (
                <div className="guests-empty">
                  <div className="guests-empty-icon">🍽️</div>
                  <h3>No meals recorded yet</h3>
                  <p className="muted">Switch to "Manage by Guest" to add meal entries for your guests.</p>
                </div>
              ) : (
                <>
                  {/* Grand totals */}
                  {(() => {
                    const gt = { bf: 0, lu: 0, sn: 0, di: 0, totalPeople: 0 };
                    for (const d of mealSummary) {
                      const t = d.totals || {};
                      gt.bf += t.breakfastPeople || 0;
                      gt.lu += t.lunchPeople || 0;
                      gt.sn += t.snackPeople || 0;
                      gt.di += t.dinnerPeople || 0;
                      gt.totalPeople += t.totalPeople || 0;
                    }
                    return (
                      <div className="summary-grid" style={{ marginBottom: 20 }}>
                        <div className="summary-card"><div className="summary-card-body"><span className="summary-number">{mealSummary.length}</span><span className="summary-label">Meal Days</span></div></div>
                        <div className="summary-card"><div className="summary-card-body"><span className="summary-number">🌅 {gt.bf}</span><span className="summary-label">Total Breakfast</span></div></div>
                        <div className="summary-card"><div className="summary-card-body"><span className="summary-number">☀️ {gt.lu}</span><span className="summary-label">Total Lunch</span></div></div>
                        <div className="summary-card"><div className="summary-card-body"><span className="summary-number">🍪 {gt.sn}</span><span className="summary-label">Total Snack</span></div></div>
                        <div className="summary-card"><div className="summary-card-body"><span className="summary-number">🌙 {gt.di}</span><span className="summary-label">Total Dinner</span></div></div>
                      </div>
                    );
                  })()}

                  {/* Per-date cards */}
                  {mealSummary.map((day) => {
                    const t = day.totals || {};
                    const isExpanded = expandedMealDate === day.date;
                    return (
                      <div key={day.date} className="card" style={{ marginBottom: 12 }}>
                        <div className="card-toggle-header" onClick={() => setExpandedMealDate(isExpanded ? null : day.date)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0 }}>📅 {day.date}</h3>
                            <span className="badge" style={{ whiteSpace: 'nowrap' }}>{t.totalGuests} guest{t.totalGuests !== 1 ? 's' : ''} · {t.totalPeople} people</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 10, fontSize: '.82rem' }}>
                              <span title="Breakfast">🌅 <strong>{t.breakfastPeople}</strong></span>
                              <span title="Lunch">☀️ <strong>{t.lunchPeople}</strong></span>
                              <span title="Snack">🍪 <strong>{t.snackPeople}</strong></span>
                              <span title="Dinner">🌙 <strong>{t.dinnerPeople}</strong></span>
                            </div>
                            <span className={`toggle-icon ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: 12 }}>
                            {/* Meal count summary for this date */}
                            <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                              <div style={{ background: 'rgba(108,92,231,.06)', borderRadius: 8, padding: '10px 18px', textAlign: 'center', minWidth: 130 }}>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>🌅 Breakfast</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>{t.breakfastPeople}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{t.breakfastGuests} guest{t.breakfastGuests !== 1 ? 's' : ''} · {t.breakfastPeople} people</div>
                              </div>
                              <div style={{ background: 'rgba(108,92,231,.06)', borderRadius: 8, padding: '10px 18px', textAlign: 'center', minWidth: 130 }}>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>☀️ Lunch</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>{t.lunchPeople}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{t.lunchGuests} guest{t.lunchGuests !== 1 ? 's' : ''} · {t.lunchPeople} people</div>
                              </div>
                              <div style={{ background: 'rgba(108,92,231,.06)', borderRadius: 8, padding: '10px 18px', textAlign: 'center', minWidth: 130 }}>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>🍪 Snack</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>{t.snackPeople}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{t.snackGuests} guest{t.snackGuests !== 1 ? 's' : ''} · {t.snackPeople} people</div>
                              </div>
                              <div style={{ background: 'rgba(108,92,231,.06)', borderRadius: 8, padding: '10px 18px', textAlign: 'center', minWidth: 130 }}>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>🌙 Dinner</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>{t.dinnerPeople}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{t.dinnerGuests} guest{t.dinnerGuests !== 1 ? 's' : ''} · {t.dinnerPeople} people</div>
                              </div>
                            </div>

                            {/* Guest detail table */}
                            <table className="guest-table">
                              <thead>
                                <tr>
                                  <th style={{ width: 40 }}>#</th>
                                  <th>Guest</th>
                                  <th>Head Count</th>
                                  <th style={{ textAlign: 'center' }}>🌅 Breakfast</th>
                                  <th style={{ textAlign: 'center' }}>☀️ Lunch</th>
                                  <th style={{ textAlign: 'center' }}>🍪 Snack</th>
                                  <th style={{ textAlign: 'center' }}>🌙 Dinner</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(day.guests || []).map((g, i) => (
                                  <tr key={g.mealId}>
                                    <td className="guest-row-num">{i + 1}</td>
                                    <td>
                                      <div className="guest-name-cell">
                                        <div className="guest-avatar">{(g.guestName || '??')[0]}{(g.guestName || '??').split(' ')[1]?.[0] || ''}</div>
                                        <div>
                                          <strong className="guest-name">{g.guestName}</strong>
                                          {g.guestPhone && <span className="guest-email">📞 {g.guestPhone}</span>}
                                        </div>
                                      </div>
                                    </td>
                                    <td><span style={{ whiteSpace: 'nowrap' }}>{g.adultsCount}A + {g.kidsCount}K = <strong>{g.headCount}</strong></span></td>
                                    <td style={{ textAlign: 'center' }}>{g.breakfast ? '✅' : '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{g.lunch ? '✅' : '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{g.snack ? '✅' : '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{g.dinner ? '✅' : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* ========== MANAGE SUB-TAB ========== */}
          {mealSubTab === 'manage' && (
            <>
              {eventGuests.length === 0 && <p className="muted">Assign guests first.</p>}
              {eventGuests.map((eg) => {
                const g = eg.guest || {};
                return (
                  <div key={eg.id} className="card meal-card">
                    <div className="card-toggle-header" onClick={() => {
                      if (mealEgId === eg.id) { setMealEgId(null); }
                      else {
                        setMealEgId(eg.id);
                        loadMeals(eg.id);
                        // Auto-fill meal date from arrival date
                        const arrivalDate = eg.accommodationFromDate || '';
                        setMealForm({ ...MEAL_EMPTY, mealDate: arrivalDate });
                        setEditingMeal(null);
                      }
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="guest-avatar" style={{ width: 32, height: 32, fontSize: '.7rem' }}>{(g.firstName || '?')[0]}{(g.lastName || '?')[0]}</div>
                        <div>
                          <h3 style={{ margin: 0 }}>{g.firstName} {g.lastName}</h3>
                          <small className="muted">{eg.adultsCount}A + {eg.kidsCount}K = {eg.adultsCount + eg.kidsCount} people</small>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge">{(mealsByEg[eg.id] || eg.meals || []).length} meal day{(mealsByEg[eg.id] || eg.meals || []).length !== 1 ? 's' : ''}</span>
                        <span className={`toggle-icon ${mealEgId === eg.id ? 'open' : ''}`}>&#9660;</span>
                      </div>
                    </div>

                    {mealEgId === eg.id && (
                      <div style={{ marginTop: 12 }}>
                        {eg.accommodationFromDate && (
                          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                            🏠 Stay: <strong>{eg.accommodationFromDate}</strong> → <strong>{eg.accommodationToDate || '?'}</strong> · meal dates restricted to this range
                          </div>
                        )}
                        {(mealsByEg[eg.id] || []).length > 0 && (
                          <table className="guest-table" style={{ marginBottom: 12 }}>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th style={{ textAlign: 'center' }}>🌅 Breakfast</th>
                                <th style={{ textAlign: 'center' }}>☀️ Lunch</th>
                                <th style={{ textAlign: 'center' }}>🍪 Snack</th>
                                <th style={{ textAlign: 'center' }}>🌙 Dinner</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(mealsByEg[eg.id] || []).map((m) => (
                                <tr key={m.id}>
                                  <td><strong>{m.mealDate}</strong></td>
                                  <td style={{ textAlign: 'center' }}>{m.breakfast ? '✅' : '—'}</td>
                                  <td style={{ textAlign: 'center' }}>{m.lunch ? '✅' : '—'}</td>
                                  <td style={{ textAlign: 'center' }}>{m.snack ? '✅' : '—'}</td>
                                  <td style={{ textAlign: 'center' }}>{m.dinner ? '✅' : '—'}</td>
                                  <td className="actions-cell">
                                    <button className="btn btn-sm" onClick={() => { setEditingMeal(m); setMealForm({ mealDate: m.mealDate, breakfast: m.breakfast, lunch: m.lunch, snack: m.snack, dinner: m.dinner }); }}>✏️</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteMeal(eg.id, m.id)}>🗑️</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        <form onSubmit={handleSaveMeal} style={{ background: 'var(--bg)', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 18px' }}>
                          <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                            {editingMeal ? '✏️ Edit Meal Date' : '➕ Add Meal Date'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                            <div style={{ width: 180, flexShrink: 0 }}>
                              <CustomDatePicker
                                value={mealForm.mealDate}
                                onChange={(e) => setMealForm((p) => ({ ...p, mealDate: e.target.value }))}
                                placeholder="Select date"
                                required
                                min={eg.accommodationFromDate || undefined}
                                max={eg.accommodationToDate || undefined}
                              />
                              {eg.accommodationFromDate && <span className="phone-hint">{eg.accommodationFromDate} → {eg.accommodationToDate || '?'}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                              <label className="check-label"><input type="checkbox" checked={mealForm.breakfast} onChange={(e) => setMealForm((p) => ({ ...p, breakfast: e.target.checked }))} /> 🌅 Breakfast</label>
                              <label className="check-label"><input type="checkbox" checked={mealForm.lunch} onChange={(e) => setMealForm((p) => ({ ...p, lunch: e.target.checked }))} /> ☀️ Lunch</label>
                              <label className="check-label"><input type="checkbox" checked={mealForm.snack} onChange={(e) => setMealForm((p) => ({ ...p, snack: e.target.checked }))} /> 🍪 Snack</label>
                              <label className="check-label"><input type="checkbox" checked={mealForm.dinner} onChange={(e) => setMealForm((p) => ({ ...p, dinner: e.target.checked }))} /> 🌙 Dinner</label>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                              <button type="submit" className="btn btn-primary btn-sm">{editingMeal ? 'Update' : '+ Add'}</button>
                              {editingMeal && <button type="button" className="btn btn-sm" onClick={() => { setEditingMeal(null); setMealForm(MEAL_EMPTY); }}>Cancel</button>}
                            </div>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </>
      )}

      {/* ==================== SCHEDULE TAB ==================== */}
      {tab === 'schedule' && (
        <>
          <div className="page-header">
            <h2>📋 Event Schedule</h2>
            <button className="btn btn-primary" onClick={() => { if (showSchedForm && !editingSched) { setShowSchedForm(false); setSchedForm(SCHED_EMPTY); } else { setEditingSched(null); setSchedForm(SCHED_EMPTY); setShowSchedForm(true); } }}>
              {showSchedForm && !editingSched ? '✕ Cancel' : '+ Add Schedule'}
            </button>
          </div>

          {(showSchedForm || editingSched) && (
            <div className="card">
              <h3>{editingSched ? '✏️ Edit Schedule Item' : '🆕 New Schedule Item'}</h3>
              <form onSubmit={handleSaveSched} style={{ marginTop: 12 }}>
                <div className="form-row">
                  <label>Title <input value={schedForm.title} onChange={(e) => setSchedForm((p) => ({ ...p, title: e.target.value }))} required placeholder="e.g. Welcome Ceremony" /></label>
                  <label>Date <CustomDatePicker value={schedForm.scheduleDate} onChange={(e) => setSchedForm((p) => ({ ...p, scheduleDate: e.target.value }))} required /></label>
                </div>
                <div className="form-row">
                  <label>Start Time <input type="time" value={schedForm.startTime} onChange={(e) => setSchedForm((p) => ({ ...p, startTime: e.target.value }))} required /></label>
                  <label>End Time <input type="time" value={schedForm.endTime} onChange={(e) => setSchedForm((p) => ({ ...p, endTime: e.target.value }))} /></label>
                  <label>Description <input value={schedForm.description} onChange={(e) => setSchedForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional details" /></label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">{editingSched ? 'Update' : 'Add'}</button>
                  <button type="button" className="btn" onClick={() => { setEditingSched(null); setSchedForm(SCHED_EMPTY); setShowSchedForm(false); }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {schedules.length === 0 && !showSchedForm && (
            <div className="guests-empty">
              <div className="guests-empty-icon">📋</div>
              <h3>No schedule items yet</h3>
              <p className="muted">Click "+ Add Schedule" to plan your event timeline.</p>
            </div>
          )}

          {schedules.length > 0 && (() => {
            // Group schedules by date
            const byDate = {};
            schedules.forEach((s) => {
              const d = s.scheduleDate || 'Unscheduled';
              if (!byDate[d]) byDate[d] = [];
              byDate[d].push(s);
            });
            // Sort dates
            const sortedDates = Object.keys(byDate).sort();
            // Sort items within each date by startTime
            sortedDates.forEach((d) => byDate[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')));

            // Calculate duration helper
            const calcDuration = (start, end) => {
              if (!start || !end) return null;
              const [sh, sm] = start.split(':').map(Number);
              const [eh, em] = end.split(':').map(Number);
              let mins = (eh * 60 + em) - (sh * 60 + sm);
              if (mins <= 0) return null;
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
            };

            const formatTime = (t) => {
              if (!t) return '';
              const [h, m] = t.split(':').map(Number);
              const ampm = h >= 12 ? 'PM' : 'AM';
              const h12 = h % 12 || 12;
              return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
            };

            return (
              <>
                <div className="summary-grid" style={{ marginBottom: 20 }}>
                  <div className="summary-card"><div className="summary-card-body"><span className="summary-number">{sortedDates.length}</span><span className="summary-label">Day{sortedDates.length !== 1 ? 's' : ''}</span></div></div>
                  <div className="summary-card"><div className="summary-card-body"><span className="summary-number">{schedules.length}</span><span className="summary-label">Total Items</span></div></div>
                </div>

                {sortedDates.map((date) => (
                  <div key={date} className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <h3 style={{ margin: 0 }}>📅 {date}</h3>
                      <span className="badge">{byDate[date].length} item{byDate[date].length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="schedule-timeline">
                      {byDate[date].map((s, idx) => {
                        const duration = calcDuration(s.startTime, s.endTime);
                        return (
                          <div key={s.id} className="schedule-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 0', borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                            <div style={{ minWidth: 55, textAlign: 'center' }}>
                              <div style={{ fontSize: '1.5rem' }}>
                                {s.startTime < '12:00' ? '🌅' : s.startTime < '17:00' ? '☀️' : '🌙'}
                              </div>
                              <div style={{ fontSize: '.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>
                                {formatTime(s.startTime)}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '1rem' }}>{s.title}</strong>
                                {duration && <span className="badge" style={{ fontSize: '.7rem' }}>⏱️ {duration}</span>}
                              </div>
                              <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                {formatTime(s.startTime)}{s.endTime ? ` → ${formatTime(s.endTime)}` : ''}
                              </div>
                              {s.description && <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>{s.description}</p>}
                            </div>
                            <div className="actions-cell" style={{ flexShrink: 0 }}>
                              <button className="btn-icon" title="Edit" onClick={() => { setEditingSched(s); setSchedForm({ title: s.title, scheduleDate: s.scheduleDate, startTime: s.startTime, endTime: s.endTime || '', description: s.description || '' }); setShowSchedForm(true); }}>✏️</button>
                              <button className="btn-icon btn-danger" title="Delete" onClick={() => handleDeleteSched(s.id)}>🗑️</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
        </>
      )}
      <ConfirmModal
        open={confirmDelete !== null}
        title={confirmDelete?.type === 'guest' ? 'Remove Guest' : confirmDelete?.type === 'schedule' ? 'Delete Schedule' : 'Delete Meal'}
        message={confirmDelete?.type === 'guest' ? 'Remove this guest from the event? Their meal records will also be deleted.' : 'Are you sure you want to delete this? This action cannot be undone.'}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
