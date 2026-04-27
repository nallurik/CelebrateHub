import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

export default function CustomSelect({ value, onChange, options, placeholder, required, name, disabled }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selected = options.find((o) => (typeof o === 'string' ? o : o.value) === value);
  const label = selected ? (typeof selected === 'string' ? selected : selected.label) : null;

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
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!open) return;
    positionMenu();
    const onScroll = () => positionMenu();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, positionMenu]);

  const handleSelect = (val) => {
    onChange({ target: { value: val, name } });
    setOpen(false);
  };

  const menu = open ? ReactDOM.createPortal(
    <ul className="cselect-menu" ref={menuRef} style={menuStyle}>
      {placeholder && (
        <li className="cselect-option cselect-option--disabled">{placeholder}</li>
      )}
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lbl = typeof opt === 'string' ? opt : opt.label;
        const isActive = val === value;
        return (
          <li
            key={val}
            className={`cselect-option ${isActive ? 'cselect-option--active' : ''}`}
            onClick={() => handleSelect(val)}
          >
            <span>{lbl}</span>
            {isActive && <span className="cselect-check">✓</span>}
          </li>
        );
      })}
    </ul>,
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
