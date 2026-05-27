import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * MultiSelect – a searchable, multi-value dropdown.
 *
 * Props:
 *   values    {string[]}  – array of currently selected values
 *   onChange  {fn}        – called with new string[] when selection changes
 *   options   {Array}     – array of strings or { value, label } objects
 *   placeholder {string}  – trigger text when nothing selected
 */
export default function MultiSelect({ values = [], onChange, options = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const normalize = (o) => (typeof o === 'string' ? { value: o, label: o } : o);

  const normalized = options.map(normalize);

  const filteredOptions = search
    ? normalized.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : normalized;

  const positionMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!open) return;
    positionMenu();
    setTimeout(() => searchRef.current?.focus(), 10);
    const reposition = () => positionMenu();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, positionMenu]);

  const toggle = (val) => {
    const next = values.includes(val)
      ? values.filter((v) => v !== val)
      : [...values, val];
    onChange(next);
  };

  const triggerLabel =
    values.length === 0
      ? null
      : normalized.filter((o) => values.includes(o.value)).map((o) => o.label).join(', ');

  const menu = open
    ? ReactDOM.createPortal(
        <div
          className="cselect-menu"
          ref={menuRef}
          style={{ ...menuStyle, padding: 0 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            ref={searchRef}
            className="cselect-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search..."
            onClick={(e) => e.stopPropagation()}
          />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {filteredOptions.length === 0 && (
              <li className="cselect-option cselect-option--disabled">No results</li>
            )}
            {filteredOptions.map((opt) => {
              const active = values.includes(opt.value);
              return (
                <li
                  key={opt.value}
                  className={`cselect-option ${active ? 'cselect-option--active' : ''}`}
                  onClick={() => toggle(opt.value)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => {}}
                      style={{ pointerEvents: 'none', accentColor: 'var(--primary)' }}
                    />
                    {opt.label}
                  </span>
                  {active && <span className="cselect-check" style={{ marginLeft: 'auto' }}>✓</span>}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`cselect ${open ? 'cselect--open' : ''}`} ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        className={`cselect-trigger ${!triggerLabel ? 'cselect-placeholder' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cselect-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {triggerLabel || placeholder || 'Select...'}
        </span>
        <span className="cselect-arrow">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
          </svg>
        </span>
      </button>
      {menu}
    </div>
  );
}
