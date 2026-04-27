import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  const compute = useCallback(async () => {
    try {
      const events = await api.getEvents();
      const items = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);
      const in7 = new Date(today);
      in7.setDate(in7.getDate() + 7);
      const in7Str = in7.toISOString().slice(0, 10);

      // Upcoming events
      (events || []).forEach(ev => {
        if (!ev.date) return;
        const egs = ev.eventGuests || [];
        if (ev.date === todayStr) {
          items.push({ icon: '🎉', text: `"${ev.name}" is today!`, priority: 1 });
        } else if (ev.date > todayStr && ev.date <= in7Str) {
          items.push({ icon: '📅', text: `"${ev.name}" coming up on ${ev.date}`, priority: 2 });
        }

        // Pickups today
        egs.forEach(eg => {
          if (eg.needsTransport && eg.pickupDate === todayStr) {
            const name = eg.guest ? `${eg.guest.firstName} ${eg.guest.lastName}` : 'Guest';
            items.push({ icon: '🚗', text: `Pickup: ${name} at ${eg.pickupTime || 'TBD'} from ${eg.pickupLocation || '?'}`, priority: 1 });
          }
        });

        // Accommodation check-ins today
        egs.forEach(eg => {
          if (eg.needsAccommodation && eg.accommodationFromDate === todayStr) {
            const name = eg.guest ? `${eg.guest.firstName} ${eg.guest.lastName}` : 'Guest';
            items.push({ icon: '🏠', text: `Check-in today: ${name}${eg.accommodationPlaceName ? ` at ${eg.accommodationPlaceName}` : ''}`, priority: 1 });
          }
        });

        // Events with no guests assigned
        if (ev.date >= todayStr && egs.length === 0) {
          items.push({ icon: '⚠️', text: `"${ev.name}" has no guests assigned yet`, priority: 2 });
        }

        // Guests needing transport but no helper assigned
        const unassignedTransport = egs.filter(eg => eg.needsTransport && !eg.transportHelperId).length;
        if (unassignedTransport > 0 && ev.date >= todayStr) {
          items.push({ icon: '🚗', text: `${unassignedTransport} guest${unassignedTransport > 1 ? 's' : ''} in "${ev.name}" need transport helper`, priority: 2 });
        }
      });

      items.sort((a, b) => a.priority - b.priority);
      setNotifications(items);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { compute(); const t = setInterval(compute, 60000); return () => clearInterval(t); }, [compute]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const urgentCount = notifications.filter(n => n.priority <= 2).length;

  return (
    <div className="notifications-wrap" ref={ref}>
      <button className="notifications-bell" onClick={() => setOpen(v => !v)} title="Notifications">
        🔔
        {urgentCount > 0 && <span className="notifications-badge">{urgentCount}</span>}
      </button>
      {open && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <strong>Notifications</strong>
            <span className="muted" style={{ fontSize: '.8rem' }}>{notifications.length} item{notifications.length !== 1 ? 's' : ''}</span>
          </div>
          {notifications.length === 0 ? (
            <div className="notifications-empty">All clear! No notifications.</div>
          ) : (
            <div className="notifications-list">
              {notifications.map((n, i) => (
                <div key={i} className={`notification-item ${n.priority <= 1 ? 'notification-urgent' : ''}`}>
                  <span className="notification-icon">{n.icon}</span>
                  <span className="notification-text">{n.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
