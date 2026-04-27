import React from 'react';

const PAGE_SIZES = [10, 25, 50];

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Build page numbers: always show first, last, current ± 1, with ellipses
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {start}–{end} of {totalItems}
      </div>
      <div className="pagination-controls">
        <button className="pagination-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>‹</button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="pagination-ellipsis">…</span>
          ) : (
            <button key={p} className={`pagination-btn ${p === page ? 'pagination-btn--active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
          )
        )}
        <button className="pagination-btn" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>›</button>
      </div>
      {onPageSizeChange && (
        <div className="pagination-size">
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
