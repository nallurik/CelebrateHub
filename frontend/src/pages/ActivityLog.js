import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';

const ACTION_ICONS = { CREATE: '🆕', UPDATE: '✏️', DELETE: '🗑️', CLONE: '📋', IMPORT: '📤' };
const ENTITY_FILTERS = ['', 'Event', 'Guest', 'EventGuest', 'Helper', 'DropOffLocation'];

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    setLoading(true);
    api.getActivityLogs(filter || undefined)
      .then(setLogs)
      .catch((err) => addToast(err.message))
      .finally(() => setLoading(false));
  }, [filter, addToast]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(log =>
      `${log.action || ''} ${log.entityType || ''} ${log.entityName || ''} ${log.details || ''}`.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>📜 Activity Log</h2>
        <p className="muted">Recent changes across your events, guests and crew</p>
      </div>

      <div className="guests-toolbar">
        <div className="guests-search-wrap">
          <span className="guests-search-icon">🔍</span>
          <input
            type="text"
            className="guests-search-input"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="guests-search-clear" type="button" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <select className="form-control" style={{ width: 180 }} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          {ENTITY_FILTERS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="guests-count-badge">{filtered.length} log{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="guests-empty">
          <div className="guests-empty-icon">📜</div>
          <h3>{search ? 'No matching logs' : 'No activity yet'}</h3>
          <p className="muted">{search ? 'Try a different search term.' : 'Actions like creating events and guests will appear here.'}</p>
        </div>
      ) : (
        <>
          <div className="guest-table-wrap">
            <table className="guest-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Action</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th>Name</th>
                  <th>Details</th>
                  <th style={{ width: 160 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span title={log.action}>{ACTION_ICONS[log.action] || '📝'} {log.action}</span>
                    </td>
                    <td><span className="badge">{log.entityType}</span></td>
                    <td>
                      <strong>{log.entityName || '—'}</strong>
                      {log.entityId && <span className="muted" style={{ marginLeft: 4 }}>#{log.entityId}</span>}
                    </td>
                    <td><span className="muted">{log.details || '—'}</span></td>
                    <td><span className="muted" style={{ fontSize: '.82rem' }}>{formatTime(log.timestamp)}</span></td>
                  </tr>
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
    </div>
  );
}
