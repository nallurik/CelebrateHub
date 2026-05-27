import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import CustomDatePicker from '../components/CustomDatePicker';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { api.getEvents().then(setEvents).catch((err) => addToast(err.message)).finally(() => setLoading(false)); }, [addToast]);

  const resetForm = () => { setName(''); setDate(''); setTime(''); setDescription(''); setLocation(''); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !date) return;
    try {
      const created = await api.createEvent({ name, date, time, description, location });
      setEvents((prev) => [...prev, created]);
      resetForm();
      setShowForm(false);
      addToast('Event created successfully', 'success');
    } catch (err) { addToast(err.message); }
  };

  const handleDelete = (id) => setConfirmDelete(id);
  const doDelete = async () => {
    try {
      await api.deleteEvent(confirmDelete);
      setEvents((prev) => prev.filter((ev) => ev.id !== confirmDelete));
      setConfirmDelete(null);
      addToast('Event deleted', 'success');
    } catch (err) { addToast(err.message); setConfirmDelete(null); }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>My Events</h1>
        <button className="btn btn-primary" onClick={() => { if (showForm) { resetForm(); } setShowForm(!showForm); }}>
          {showForm ? '✕ Cancel' : '+ Add Event'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <h2>Create New Event</h2>
          <div className="form-row">
            <label><span>Event Name <span className="required">*</span></span><input placeholder="e.g. Son's Birthday" value={name} onChange={(e) => setName(e.target.value)} required /></label>
            <label><span>Event Date <span className="required">*</span></span><CustomDatePicker value={date} onChange={(e) => setDate(e.target.value)} required /></label>
            <label><span>Event Time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label><span>Location / Venue</span><input placeholder="Optional" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <label><span>Description</span><input placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>Create Event</button>
        </form>
      )}

      {events.length === 0 && !showForm && <p className="muted">No events yet. Click "+ Add Event" to create one!</p>}

      <div className="event-grid">
        {events.map((ev) => (
          <div key={ev.id} className="card event-card">
            <h3>{ev.name}</h3>
            <p className="muted">{ev.date}{ev.time ? ` · ⏰ ${ev.time}` : ''}</p>
            {ev.location && <p>📍 {ev.location}</p>}
            {ev.description && <p>{ev.description}</p>}
            <div className="card-actions">
              <Link to={`/events/${ev.id}`} className="btn btn-primary">Manage</Link>
              <button className="btn btn-danger" onClick={() => handleDelete(ev.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete Event"
        message="Are you sure you want to delete this event? All associated data will be lost."
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
