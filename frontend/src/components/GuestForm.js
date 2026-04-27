import React, { useState } from 'react';
import CustomSelect from './CustomSelect';

const GUEST_TYPES = ['FAMILY', 'FRIEND', 'VIP', 'COLLEAGUE', 'OTHER'];
const TYPE_LABELS = { FAMILY: 'Family', FRIEND: 'Friend', VIP: 'VIP', COLLEAGUE: 'Colleague', OTHER: 'Other' };

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '',
  referencePerson: '', guestType: 'FAMILY',
  country: 'India', state: '', district: '', village: '',
};

export default function GuestForm({ guest, onSave, onCancel }) {
  const [form, setForm] = useState(guest ? { ...EMPTY, ...guest } : EMPTY);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave(form);
    if (!guest) setForm(EMPTY);
  };

  return (
    <form onSubmit={submit} className="guest-form" style={{ marginTop: 12 }}>
      <fieldset>
        <legend>Personal Info</legend>
        <div className="form-row">
          <label>First Name <input value={form.firstName} onChange={set('firstName')} required /></label>
          <label>Last Name <input value={form.lastName} onChange={set('lastName')} required /></label>
        </div>
        <div className="form-row">
          <label>Email <input type="email" value={form.email} onChange={set('email')} placeholder="Optional" /></label>
          <label>Phone <input value={form.phone} onChange={set('phone')} required placeholder="Required" /></label>
        </div>
        <div className="form-row">
          <label>Reference Person <input value={form.referencePerson} onChange={set('referencePerson')} placeholder="Related to / Invited by" /></label>
          <label>Type
            <CustomSelect
              value={form.guestType}
              onChange={set('guestType')}
              options={GUEST_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
              placeholder="Select type"
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Address</legend>
        <div className="form-row">
          <label>Country <input value={form.country} onChange={set('country')} /></label>
          <label>State <input value={form.state} onChange={set('state')} /></label>
        </div>
        <div className="form-row">
          <label>District <input value={form.district} onChange={set('district')} /></label>
          <label>Village <input value={form.village} onChange={set('village')} /></label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{guest ? 'Update' : 'Add Guest'}</button>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
