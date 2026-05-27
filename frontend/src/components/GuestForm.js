import React, { useState } from 'react';
import CustomSelect from './CustomSelect';

const GUEST_TYPES = ['FAMILY', 'FRIEND', 'VIP', 'COLLEAGUE', 'OTHER'];
const TYPE_LABELS = { FAMILY: 'Family', FRIEND: 'Friend', VIP: 'VIP', COLLEAGUE: 'Colleague', OTHER: 'Other' };
const COUNTRIES = ['India', 'USA'];

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '',
  referencePerson: '', guestType: 'FAMILY',
  country: 'India', state: '', district: '', village: '',
};

export default function GuestForm({ guest, onSave, onCancel, referencePersonSuggestions = [] }) {
  const [form, setForm] = useState(guest ? { ...EMPTY, ...guest } : EMPTY);
  const [phoneError, setPhoneError] = useState('');

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, phone: val }));
    if (val.length > 0 && val.length < 10) {
      setPhoneError('Phone must be 10 digits');
    } else {
      setPhoneError('');
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (form.phone && form.phone.length !== 10) {
      setPhoneError('Phone must be exactly 10 digits');
      return;
    }
    onSave(form);
    if (!guest) setForm(EMPTY);
  };

  return (
    <form onSubmit={submit} className="guest-form" style={{ marginTop: 12 }}>
      <fieldset>
        <legend>Personal Info</legend>
        <div className="form-row">
          <label><span>First Name <span className="required">*</span></span><input value={form.firstName} onChange={set('firstName')} required /></label>
          <label><span>Last Name <span className="required">*</span></span><input value={form.lastName} onChange={set('lastName')} required /></label>
        </div>
        <div className="form-row">
          <label><span>Email</span><input type="email" value={form.email} onChange={set('email')} placeholder="Optional" /></label>
          <label>
            <span>Phone <span className="required">*</span></span>
            <input
              value={form.phone}
              onChange={handlePhoneChange}
              required
              placeholder="10 digits only"
              maxLength={10}
              inputMode="numeric"
            />
            {phoneError && <span className="phone-hint" style={{ color: 'var(--danger)' }}>{phoneError}</span>}
            {!phoneError && <span className="phone-hint">Digits only, max 10</span>}
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>Reference Person</span>
            <input
              value={form.referencePerson}
              onChange={set('referencePerson')}
              placeholder="Related to / Invited by"
              list="ref-person-suggestions"
            />
            {referencePersonSuggestions.length > 0 && (
              <datalist id="ref-person-suggestions">
                {referencePersonSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
          </label>
          <label><span>Type <span className="required">*</span></span>
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
          <label><span>Country</span>
            <select value={form.country} onChange={set('country')} className="form-control">
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="Other">Other</option>
            </select>
          </label>
          <label><span>State</span><input value={form.state} onChange={set('state')} /></label>
        </div>
        <div className="form-row">
          <label><span>District</span><input value={form.district} onChange={set('district')} /></label>
          <label><span>Village</span><input value={form.village} onChange={set('village')} /></label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{guest ? 'Update' : 'Add Guest'}</button>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
