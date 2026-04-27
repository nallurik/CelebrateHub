import React, { useState } from 'react';
import { Routes, Route, Link, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ThemeSelector from './components/ThemeSelector';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import Helpers from './pages/Helpers';
import Accommodations from './pages/Accommodations';
import Guests from './pages/Guests';
import DropOffLocations from './pages/DropOffLocations';
import ActivityLog from './pages/ActivityLog';
import NotificationsPanel from './components/NotificationsPanel';
import CrewDashboard from './pages/CrewDashboard';

export default function App() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    return <Login />;
  }

  const isCrew = user.role === 'CREW';

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          {!isCrew && (
            <button className="sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)} title="Toggle menu">
              <span className="hamburger" />
            </button>
          )}
          <Link to="/" className="brand">
            <span className="brand-logo">CH</span>
            <span className="brand-name">CelebrateHub</span>
            <span className="brand-tagline">Every moment, perfectly planned</span>
          </Link>
        </div>
        <div className="nav-right">
          <ThemeSelector />
          {!isCrew && <NotificationsPanel />}
          <span className="nav-user">Hi, {user.username}</span>
          {isCrew && <span className="nav-badge-crew">Crew</span>}
          <button className="btn btn-sm nav-logout" onClick={logout}>Logout</button>
        </div>
      </nav>

      {isCrew ? (
        /* Crew layout — no sidebar */
        <div className="app-body">
          <div className="main-scroll">
            <main className="main-content" style={{ marginLeft: 0, maxWidth: 1260 }}>
              <CrewDashboard />
            </main>
          </div>
        </div>
      ) : (
        /* Admin layout — full sidebar */
        <div className="app-body">
          <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
            <nav className="sidebar-nav">
              <div className="sidebar-section">
                <span className="sidebar-section-label">Main</span>
                <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">📊</span>
                  <span className="sidebar-text">Dashboard</span>
                </NavLink>
                <NavLink to="/events" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">🎉</span>
                  <span className="sidebar-text">Events</span>
                </NavLink>
              </div>
              <div className="sidebar-section">
                <span className="sidebar-section-label">Management</span>
                <NavLink to="/guests" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">👥</span>
                  <span className="sidebar-text">Guests</span>
                </NavLink>
                <NavLink to="/helpers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">🛠️</span>
                  <span className="sidebar-text">Crew</span>
                </NavLink>
                <NavLink to="/accommodations" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">🏠</span>
                  <span className="sidebar-text">Accommodations</span>
                </NavLink>
                <NavLink to="/locations" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">📍</span>
                  <span className="sidebar-text">Locations</span>
                </NavLink>
                <NavLink to="/activity-log" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">📜</span>
                  <span className="sidebar-text">Activity Log</span>
                </NavLink>
              </div>
            </nav>
          </aside>
          <div className="main-scroll">
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/events" element={<EventList />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/guests" element={<Guests />} />
                <Route path="/helpers" element={<Helpers />} />
                <Route path="/accommodations" element={<Accommodations />} />
                <Route path="/locations" element={<DropOffLocations />} />
                <Route path="/activity-log" element={<ActivityLog />} />
              </Routes>
            </main>
          </div>
        </div>
      )}

      {/* Fixed Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <span className="footer-brand"><span className="brand-logo" style={{width:24,height:24,borderRadius:6,fontSize:'.6rem',display:'inline-flex'}}>CH</span> CelebrateHub</span>
          <span className="footer-copy">&copy; {new Date().getFullYear()} CelebrateHub. Every moment, perfectly planned.</span>
          <span className="footer-meta">Made with ❤️ by KN</span>
        </div>
      </footer>
    </div>
  );
}
