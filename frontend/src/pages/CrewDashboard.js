import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';

const ROLE_ICONS = { Transport: '🚗', Accommodation: '🏠', Cooking: '🍳', Serving: '🍽️' };

export default function CrewDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (user?.id) {
      api.getHelperAssignments(user.id)
        .then((data) => setAssignments(data || []))
        .catch((err) => addToast(err.message))
        .finally(() => setLoading(false));
    }
  }, [user, addToast]);

  const filtered = useMemo(() => {
    if (!search.trim()) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(a =>
      `${a.guestFirstName} ${a.guestLastName}`.toLowerCase().includes(q) ||
      (a.eventName || '').toLowerCase().includes(q) ||
      (a.guestPhone || '').toLowerCase().includes(q) ||
      (a.pickupLocation || '').toLowerCase().includes(q) ||
      (a.dropOffLocation || '').toLowerCase().includes(q) ||
      (a.accommodationPlaceName || '').toLowerCase().includes(q) ||
      (a.assignedRoles || []).some(r => r.toLowerCase().includes(q))
    );
  }, [assignments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>👋 Welcome, {user.firstName} {user.lastName}</h2>
        <p className="muted">
          {user.category} crew member — Here are the guests assigned to you
        </p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{assignments.length}</span>
            <span className="summary-label">Total Assignments</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">
              {assignments.reduce((s, a) => s + (a.adultsCount || 0) + (a.kidsCount || 0), 0)}
            </span>
            <span className="summary-label">Total People</span>
          </div>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="guests-empty">
          <div className="guests-empty-icon">📋</div>
          <h3>No assignments yet</h3>
          <p className="muted">You haven't been assigned any guests. Check back later.</p>
        </div>
      ) : (
        <div className="crew-table-card">
          <div className="guests-toolbar">
            <div className="guests-search-wrap">
              <span className="guests-search-icon">🔍</span>
              <input
                className="guests-search-input"
                placeholder="Search guests, events, locations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="guests-search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <span className="guests-count-badge" style={{ flexShrink: 0 }}>
              {filtered.length} assignment{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="guest-table-wrap">
            <table className="guest-table crew-table">
              <thead>
                <tr>
                  <th style={{ width: '3%' }}>#</th>
                  <th style={{ width: '16%' }}>Guest</th>
                  <th style={{ width: '13%' }}>Event</th>
                  <th style={{ width: '7%' }}>Count</th>
                  <th style={{ width: '11%' }}>Roles</th>
                  <th style={{ width: '50%' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No matching assignments found</td></tr>
                ) : paged.map((a, idx) => (
                  <tr key={a.eventGuestId} className="guest-row-clickable">
                    <td className="guest-row-num">{(safePage - 1) * pageSize + idx + 1}</td>
                    <td>
                      <div className="guest-name-cell">
                        <div className="guest-avatar">
                          {(a.guestFirstName || '?')[0]}{(a.guestLastName || '?')[0]}
                        </div>
                        <div>
                          <strong className="guest-name">{a.guestFirstName} {a.guestLastName}</strong>
                          {a.guestPhone && <span className="guest-email">📞 {a.guestPhone}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-type-friend" style={{ whiteSpace: 'nowrap' }}>
                        🎉 {a.eventName}
                      </span>
                      {a.eventDate && <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>📅 {a.eventDate}</div>}
                    </td>
                    <td>{a.adultsCount}A / {a.kidsCount}K</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(a.assignedRoles || []).map((r) => (
                          <span key={r} className="badge" style={{ whiteSpace: 'nowrap' }}>
                            {ROLE_ICONS[r] || '📋'} {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="crew-details-cell">
                      {a.pickupLocation && (
                        <div>🚗 <strong>Pickup:</strong> {a.pickupLocation}{a.pickupDate ? ` on ${a.pickupDate}` : ''}{a.pickupTime ? ` at ${a.pickupTime}` : ''}{a.transportPeopleCount ? ` (${a.transportPeopleCount} people)` : ''}</div>
                      )}
                      {a.dropOffLocation && (
                        <div style={{ marginTop: 4 }}>
                          📍 <strong>Drop off:</strong> {a.dropOffLocation}
                          {a.dropOffAddress && <div style={{ marginLeft: 20, color: 'var(--text-secondary)' }}>📫 {a.dropOffAddress}</div>}
                          {a.dropOffContact && <div style={{ marginLeft: 20, color: 'var(--text-secondary)' }}>👤 {a.dropOffContact}{a.dropOffPhone ? ` — 📞 ${a.dropOffPhone}` : ''}</div>}
                        </div>
                      )}
                      {a.accommodationPlaceName && !a.dropOffLocation && (
                        <div>🏠 Stay: {a.accommodationPlaceName}{a.accommodationFromDate ? ` (${a.accommodationFromDate} → ${a.accommodationToDate})` : ''}</div>
                      )}
                      {!a.pickupLocation && !a.accommodationPlaceName && !a.dropOffLocation && <span className="muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
