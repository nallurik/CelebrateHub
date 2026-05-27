import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

export default function CustomDatePicker({ value, onChange, name, placeholder, required, min, max }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });
  const ref = useRef(null);
  const triggerRef = useRef(null);

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 370; // approximate height of the calendar
    const spaceBelow = window.innerHeight - r.bottom;
    const fitsBelow = spaceBelow >= dropdownHeight;
    const w = Math.max(r.width, 300);
    if (fitsBelow) {
      setPos({ top: r.bottom + 6, left: r.left, width: w });
    } else {
      setPos({ top: r.top - dropdownHeight - 6, left: r.left, width: w });
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => updatePos();
    const onClick = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      const portal = document.getElementById('cdp-portal');
      if (portal && portal.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePos]);

  // Parse current value
  const today = new Date();
  let viewYear, viewMonth;
  if (value) {
    const [y, m] = value.split('-').map(Number);
    viewYear = y; viewMonth = m - 1;
  } else {
    viewYear = today.getFullYear(); viewMonth = today.getMonth();
  }

  const [displayYear, setDisplayYear] = useState(viewYear);
  const [displayMonth, setDisplayMonth] = useState(viewMonth);

  // Sync display when value changes
  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      setDisplayYear(y); setDisplayMonth(m - 1);
    }
  }, [value]);

  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDay = new Date(displayYear, displayMonth, 1).getDay();

  const prevMonth = () => {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(displayYear - 1); }
    else setDisplayMonth(displayMonth - 1);
  };
  const nextMonth = () => {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(displayYear + 1); }
    else setDisplayMonth(displayMonth + 1);
  };

  const selectDate = (day) => {
    const m = String(displayMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange({ target: { value: `${displayYear}-${m}-${d}`, name, type: 'text' } });
    setOpen(false);
  };

  const selectToday = () => {
    const t = new Date();
    setDisplayYear(t.getFullYear()); setDisplayMonth(t.getMonth());
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    onChange({ target: { value: `${t.getFullYear()}-${m}-${d}`, name, type: 'text' } });
    setOpen(false);
  };

  const formatDisplay = (val) => {
    if (!val) return '';
    const [y, m, d] = val.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[m - 1]} ${d}, ${y}`;
  };

  const isSelected = (day) => {
    if (!value) return false;
    const m = String(displayMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return value === `${displayYear}-${m}-${d}`;
  };
  const isToday = (day) => {
    return displayYear === today.getFullYear() && displayMonth === today.getMonth() && day === today.getDate();
  };
  const isDisabled = (day) => {
    const m = String(displayMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${displayYear}-${m}-${d}`;
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = [];
  for (let y = today.getFullYear() - 10; y <= today.getFullYear() + 10; y++) years.push(y);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const toggleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  return (
    <div className="cdp-wrapper" ref={ref}>
      <div className="cdp-trigger" ref={triggerRef} onClick={toggleOpen}>
        <input
          className="cdp-input"
          value={formatDisplay(value)}
          readOnly
          placeholder={placeholder || 'Select date'}
          onClick={toggleOpen}
          onFocus={(e) => e.target.blur()}
        />
        <svg className="cdp-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      {required && <input tabIndex={-1} autoComplete="off" style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} value={value || ''} required readOnly />}
      {open && ReactDOM.createPortal(
        <div id="cdp-portal" className="cdp-dropdown" style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}>
          <div className="cdp-header">
            <button type="button" className="cdp-nav" onClick={prevMonth}>&#8249;</button>
            <div className="cdp-selects">
              <select value={displayMonth} onChange={(e) => setDisplayMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={displayYear} onChange={(e) => setDisplayYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" className="cdp-nav" onClick={nextMonth}>&#8250;</button>
          </div>
          <div className="cdp-daynames">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="cdp-days">
            {days.map((d, i) => d ? (
              <button key={i} type="button"
                className={`cdp-day${isSelected(d) ? ' cdp-day--selected' : ''}${isToday(d) ? ' cdp-day--today' : ''}${isDisabled(d) ? ' cdp-day--disabled' : ''}`}
                disabled={isDisabled(d)}
                onClick={() => selectDate(d)}>{d}</button>
            ) : <span key={i} className="cdp-day--empty" />)}
          </div>
          <button type="button" className="cdp-today-btn" onClick={selectToday}>Today</button>
        </div>,
        document.body
      )}
    </div>
  );
}
