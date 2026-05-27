import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const CHART_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#0891B2', '#EF4444', '#2563EB'];
const TYPE_LABELS = { FAMILY: 'Family', FRIEND: 'Friend', VIP: 'VIP', COLLEAGUE: 'Colleague', OTHER: 'Other' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <div className="chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: p.color || p.fill }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="var(--text)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={500}>
      {TYPE_LABELS[name] || name} {(percent * 100).toFixed(0)}%
    </text>
  );
};

const NeedStat = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="need-stat">
      <div className="need-stat-header">
        <span className="need-stat-label">{label}</span>
        <span className="need-stat-value" style={{ color }}>{count}<span className="need-stat-of">/{total}</span></span>
      </div>
      <div className="need-stat-bar-track">
        <div className="need-stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="need-stat-pct">{pct}%</span>
    </div>
  );
};

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloneTarget, setCloneTarget] = useState(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneGuests, setCloneGuests] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([api.getEvents(), api.getHelpers()])
      .then(([ev, h]) => { setEvents(ev || []); setHelpers(h || []); })
      .catch((err) => addToast(err.message))
      .finally(() => setLoading(false));
  }, [addToast]);

  const totalGuests = events.reduce((sum, ev) => sum + (ev.eventGuests ? ev.eventGuests.length : 0), 0);
  const totalPeople = events.reduce(
    (sum, ev) => sum + (ev.eventGuests || []).reduce((s, eg) => s + (eg.adultsCount || 0) + (eg.kidsCount || 0), 0), 0
  );

  // Chart data
  const guestTypeData = useMemo(() => {
    const counts = {};
    events.forEach(ev => (ev.eventGuests || []).forEach(eg => {
      const type = eg.guest?.guestType || 'OTHER';
      counts[type] = (counts[type] || 0) + 1;
    }));
    return Object.entries(counts).map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value }));
  }, [events]);

  const eventBarData = useMemo(() =>
    events.map(ev => {
      const egs = ev.eventGuests || [];
      return {
        name: ev.name.length > 15 ? ev.name.slice(0, 15) + '…' : ev.name,
        Adults: egs.reduce((s, eg) => s + (eg.adultsCount || 0), 0),
        Kids: egs.reduce((s, eg) => s + (eg.kidsCount || 0), 0),
      };
    }),
  [events]);

  const needsBarData = useMemo(() =>
    events.map(ev => {
      const egs = ev.eventGuests || [];
      const accNeed = egs.filter(eg => eg.needsAccommodation).length;
      const accAssigned = egs.filter(eg => eg.needsAccommodation && eg.accommodationHelperId).length;
      const transNeed = egs.filter(eg => eg.needsTransport).length;
      const transAssigned = egs.filter(eg => eg.needsTransport && eg.transportHelperId).length;
      return {
        name: ev.name.length > 14 ? ev.name.slice(0, 14) + '…' : ev.name,
        'Acc. Assigned': accAssigned,
        'Acc. Pending': accNeed - accAssigned,
        'Trans. Assigned': transAssigned,
        'Trans. Pending': transNeed - transAssigned,
      };
    }),
  [events]);

  // Aggregate needs overview
  const needsOverview = useMemo(() => {
    const allEgs = events.flatMap(ev => ev.eventGuests || []);
    const total = allEgs.length;
    const accNeed = allEgs.filter(eg => eg.needsAccommodation).length;
    const accAssigned = allEgs.filter(eg => eg.needsAccommodation && eg.accommodationHelperId).length;
    const transNeed = allEgs.filter(eg => eg.needsTransport).length;
    const transAssigned = allEgs.filter(eg => eg.needsTransport && eg.transportHelperId).length;
    const cookAssigned = allEgs.filter(eg => eg.cookingHelperId).length;
    const serveAssigned = allEgs.filter(eg => eg.servingHelperId).length;
    return { total, accNeed, accAssigned, transNeed, transAssigned, cookAssigned, serveAssigned };
  }, [events]);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">Welcome back! Here's a quick overview of your events.</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{events.length}</span>
            <span className="summary-label">Events</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{totalGuests}</span>
            <span className="summary-label">Total Guests</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{totalPeople}</span>
            <span className="summary-label">Total People</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-body">
            <span className="summary-number">{helpers.length}</span>
            <span className="summary-label">Crew Members</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {events.length > 0 && (
        <div className="dashboard-charts">
          {guestTypeData.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Guest Types</h3>
                <span className="chart-card-badge">{guestTypeData.reduce((s, d) => s + d.value, 0)} total</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    {guestTypeData.map((_, i) => (
                      <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.65} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={guestTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} dataKey="value" paddingAngle={3} cornerRadius={6} label={renderCustomLabel} labelLine={false}>
                    {guestTypeData.map((_, i) => <Cell key={i} fill={`url(#pieGrad${i})`} stroke="none" />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.82rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {eventBarData.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>People per Event</h3>
                <span className="chart-card-badge">{totalPeople} total</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={eventBarData} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="gradAdults" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>
                    <linearGradient id="gradKids" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#FCD34D" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--primary-bg)' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.82rem' }} />
                  <Bar dataKey="Adults" fill="url(#gradAdults)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Kids" fill="url(#gradKids)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {needsBarData.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Logistics by Event</h3>
                <span className="chart-card-badge">assigned vs pending</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={needsBarData} barCategoryGap="18%" stackOffset="sign">
                  <defs>
                    <linearGradient id="gradAccOk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#34D399" />
                    </linearGradient>
                    <linearGradient id="gradAccPend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} /><stop offset="100%" stopColor="#34D399" stopOpacity={0.15} />
                    </linearGradient>
                    <linearGradient id="gradTransOk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" /><stop offset="100%" stopColor="#F472B6" />
                    </linearGradient>
                    <linearGradient id="gradTransPend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity={0.25} /><stop offset="100%" stopColor="#F472B6" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--primary-bg)' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar dataKey="Acc. Assigned" stackId="acc" fill="url(#gradAccOk)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Acc. Pending" stackId="acc" fill="url(#gradAccPend)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Trans. Assigned" stackId="trans" fill="url(#gradTransOk)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Trans. Pending" stackId="trans" fill="url(#gradTransPend)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {needsOverview.total > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Needs Overview</h3>
                <span className="chart-card-badge">{needsOverview.total} guests total</span>
              </div>
              <div className="needs-overview-grid">
                <NeedStat label="Need Accommodation" count={needsOverview.accNeed} total={needsOverview.total} color="#10B981" />
                <NeedStat label="Acc. Helper Assigned" count={needsOverview.accAssigned} total={needsOverview.accNeed || 1} color="#059669" />
                <NeedStat label="Need Transport" count={needsOverview.transNeed} total={needsOverview.total} color="#EC4899" />
                <NeedStat label="Trans. Helper Assigned" count={needsOverview.transAssigned} total={needsOverview.transNeed || 1} color="#DB2777" />
                <NeedStat label="Cooking Crew Assigned" count={needsOverview.cookAssigned} total={needsOverview.total} color="#F59E0B" />
                <NeedStat label="Serving Crew Assigned" count={needsOverview.serveAssigned} total={needsOverview.total} color="#6366F1" />
              </div>
            </div>
          )}
        </div>
      )}

      <h2>Events</h2>
      {events.length === 0 && <p className="muted">No events yet. <Link to="/events">Create one!</Link></p>}

      <div className="event-grid">
        {events.map((ev) => {
          const egs = ev.eventGuests || [];
          const guestCount = egs.length;
          const peopleCount = egs.reduce((s, eg) => s + (eg.adultsCount || 0) + (eg.kidsCount || 0), 0);
          const stayCount = egs.filter((eg) => eg.needsAccommodation).length;
          const transportCount = egs.filter((eg) => eg.needsTransport).length;
          return (
            <div key={ev.id} className="card event-card">
              <h3>{ev.name}</h3>
              <p className="muted">📅 {ev.date}{ev.location ? ` · 📍 ${ev.location}` : ''}</p>
              {ev.description && <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)' }}>{ev.description}</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <span className="badge">👥 {guestCount} guests · {peopleCount} people</span>
                {stayCount > 0 && <span className="badge">🏠 {stayCount} need stay</span>}
                {transportCount > 0 && <span className="badge">🚗 {transportCount} need transport</span>}
                {(ev.schedules || []).length > 0 && <span className="badge">📋 {(ev.schedules || []).length} schedule</span>}
              </div>
              <div className="card-actions">
                <Link to={`/events/${ev.id}`} className="btn btn-primary btn-sm">🎯 Manage Event</Link>
                <Link to={`/events`} className="btn btn-sm">📋 All Events</Link>
                <button className="btn btn-sm" onClick={() => {
                  setCloneName(ev.name + ' (Copy)');
                  setCloneGuests(true);
                  setCloneTarget(ev);
                }}>📋 Clone</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clone Modal */}
      {cloneTarget && (
        <div className="confirm-overlay" onClick={() => setCloneTarget(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="confirm-icon">📋</div>
            <h3 className="confirm-title">Clone Event</h3>
            <p className="confirm-message">Create a copy of <strong>{cloneTarget.name}</strong></p>
            <div style={{ textAlign: 'left', marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 4, display: 'block' }}>New Event Name</label>
                <input
                  className="form-control"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('clone-confirm-btn')?.click(); } }}
                />
              </div>
              <label className="check-label" style={{ fontSize: '.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={cloneGuests} onChange={(e) => setCloneGuests(e.target.checked)} />
                <span style={{ marginLeft: 6 }}>Include guest list</span>
              </label>
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setCloneTarget(null)}>Cancel</button>
              <button id="clone-confirm-btn" className="btn btn-primary" onClick={async () => {
                try {
                  await api.cloneEvent(cloneTarget.id, { name: cloneName.trim() || cloneTarget.name + ' (Copy)', includeGuests: cloneGuests });
                  addToast(`Event cloned${cloneGuests ? ' with guests' : ''}!`, 'success');
                  setCloneTarget(null);
                  const updated = await api.getEvents();
                  setEvents(updated || []);
                } catch (err) { addToast(err.message); }
              }}>Clone Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
