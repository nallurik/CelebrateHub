import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = themes.find(t => t.id === theme) || themes[0];

  return (
    <div className="theme-selector" ref={ref}>
      <button
        className="theme-selector-btn"
        onClick={() => setOpen(v => !v)}
        title="Change theme"
      >
        <span className="theme-selector-dots">
          {current.colors.map((c, i) => (
            <span key={i} className="theme-dot" style={{ background: c }} />
          ))}
        </span>
        <span className="theme-selector-label">{current.icon}</span>
      </button>
      {open && (
        <div className="theme-dropdown">
          {themes.map(t => (
            <button
              key={t.id}
              className={`theme-option ${t.id === theme ? 'active' : ''}`}
              onClick={() => { setTheme(t.id); setOpen(false); }}
            >
              <span className="theme-option-dots">
                {t.colors.map((c, i) => (
                  <span key={i} className="theme-dot" style={{ background: c }} />
                ))}
              </span>
              <span className="theme-option-label">{t.label}</span>
              {t.id === theme && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
