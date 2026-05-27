import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

export default function CustomSelect({ value, onChange, options, placeholder, required, name, disabled, searchable }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  // Auto-enable search when options > 8
  const isSearchable = searchable || options.length > 8;

  const selected = options.find((o) => (typeof o === 'string' ? o : o.value) === value);
  const label = selected ? (typeof selected === 'string' ? selected : selected.label) : null;

  const filteredOptions = isSearchable && search
    ? options.filter((o) => {
        const lbl = typeof o === 'string' ? o : o.label;
        return lbl.toLowerCase().includes(search.toLowerCase());
      })
    : options;

  const positionMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target) &&
          menuRef.current && !menuRef.current.contains(e.target)) {
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
    if (isSearchable && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 10);
    }
    const onScroll = () => positionMenu();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, positionMenu, isSearchable]);

  const handleSelect = (val) => {
    onChange({ target: { value: val, name } });
    setOpen(false);
    setSearch('');
  };

  const menu = open ? ReactDOM.createPortal(
    <div className="cselect-menu" ref={menuRef} style={{ ...menuStyle, padding: 0 }}>
      {isSearchable && (
        <input
          ref={searchRef}
          className="cselect-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search..."
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {!isSearchable && placeholder && (
          <li className="cselect-option cselect-option--disabled">{placeholder}</li>
        )}
        {filteredOptions.length === 0 && (
          <li className="cselect-option cselect-option--disabled">No results</li>
        )}
        {filteredOptions.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          const isActive = val === value;
          const isDisabled = opt.disabled;
          return (
            <li
              key={val}
              className={`cselect-option ${isActive ? 'cselect-option--active' : ''} ${isDisabled ? 'cselect-option--disabled' : ''}`}
              onClick={() => !isDisabled && handleSelect(val)}
            >
              <span>{lbl}</span>
              {isActive && <span className="cselect-check">✓</span>}
            </li>
          );
        })}
      </ul>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`cselect ${open ? 'cselect--open' : ''} ${disabled ? 'cselect--disabled' : ''}`} ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        className={`cselect-trigger ${!label ? 'cselect-placeholder' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className="cselect-label">{label || placeholder || 'Select...'}</span>
        <span className="cselect-arrow">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
          </svg>
        </span>
      </button>
      {required && <input tabIndex={-1} value={value || ''} onChange={() => {}} required style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />}
      {menu}
    </div>
  );
}
