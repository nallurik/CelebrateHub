import React from 'react';

export default function SummaryPanel({ summary }) {
  return (
    <div className="summary-grid">
      <div className="summary-card">
        <div className="summary-card-body">
          <span className="summary-number">{summary.totalGuests}</span>
          <span className="summary-label">Guests</span>
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-card-body">
          <span className="summary-number">{summary.totalPeople}</span>
          <span className="summary-label">Total People</span>
          <span className="summary-sub">{summary.totalAdults} Adults · {summary.totalKids} Kids</span>
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-card-body">
          <span className="summary-number">{summary.needAccommodation}</span>
          <span className="summary-label">Need Accommodation</span>
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-card-body">
          <span className="summary-number">{summary.needTransport}</span>
          <span className="summary-label">Need Transport</span>
          {summary.transportPeople > 0 && <span className="summary-sub">{summary.transportPeople} people</span>}
        </div>
      </div>
      {summary.byType && Object.keys(summary.byType).length > 0 && (
        <div className="summary-card summary-card--wide">
          <div className="summary-card-body">
            <span className="summary-label" style={{ marginBottom: 6 }}>By Type</span>
            <div className="summary-type-badges">
              {Object.entries(summary.byType).map(([type, count]) => (
                <span key={type} className="summary-type-badge">{type} <strong>{count}</strong></span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
