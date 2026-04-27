import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Export an array of objects to a styled Excel file and trigger download.
 * @param {string} filename - e.g. "guests.xlsx"
 * @param {Array<{label: string, key: string|function, width?: number}>} columns
 * @param {Array<Object>} rows - data rows
 * @param {Object} [opts] - optional overrides
 * @param {string} [opts.sheetName] - worksheet name
 * @param {string} [opts.title] - title row text
 */
export async function exportExcel(filename, columns, rows, opts = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CelebrateHub';
  wb.created = new Date();

  const sheetName = opts.sheetName || 'Sheet1';
  const ws = wb.addWorksheet(sheetName);

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C5CE7' } };
  const headerFont = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  const headerBorder = {
    top: { style: 'thin', color: { argb: 'FF4834D4' } },
    bottom: { style: 'thin', color: { argb: 'FF4834D4' } },
    left: { style: 'thin', color: { argb: 'FF4834D4' } },
    right: { style: 'thin', color: { argb: 'FF4834D4' } },
  };
  const cellBorder = {
    top: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    bottom: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    left: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    right: { style: 'thin', color: { argb: 'FFD5D5D5' } },
  };
  const evenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7FF' } };

  // --- Title row ---
  const title = opts.title || sheetName;
  const titleRow = ws.addRow([title]);
  ws.mergeCells(1, 1, 1, columns.length);
  titleRow.height = 32;
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF2D3436' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFE6E9' } };

  // --- Date row ---
  const dateRow = ws.addRow([`Exported on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  •  ${rows.length} record${rows.length !== 1 ? 's' : ''}`]);
  ws.mergeCells(2, 1, 2, columns.length);
  dateRow.height = 22;
  const dateCell = dateRow.getCell(1);
  dateCell.font = { size: 9, italic: true, color: { argb: 'FF636E72' } };
  dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // --- Empty spacer row ---
  ws.addRow([]);

  // --- Header row ---
  const headerRowData = columns.map((c) => c.label);
  const hRow = ws.addRow(headerRowData);
  hRow.height = 28;
  hRow.eachCell((cell) => {
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = headerBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  // --- Data rows ---
  rows.forEach((row, idx) => {
    const values = columns.map((c) => {
      const val = typeof c.key === 'function' ? c.key(row) : row[c.key];
      return val == null ? '' : val;
    });
    const dRow = ws.addRow(values);
    dRow.height = 24;
    dRow.eachCell((cell) => {
      cell.font = { size: 10, color: { argb: 'FF2D3436' } };
      cell.border = cellBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (idx % 2 === 1) cell.fill = evenFill;
    });
  });

  // --- Column widths ---
  columns.forEach((col, i) => {
    const wsCol = ws.getColumn(i + 1);
    if (col.width) {
      wsCol.width = col.width;
    } else {
      // Auto-fit: max of header length and longest data value, capped
      let maxLen = col.label.length;
      rows.forEach((row) => {
        const val = typeof col.key === 'function' ? col.key(row) : row[col.key];
        const len = val == null ? 0 : String(val).length;
        if (len > maxLen) maxLen = len;
      });
      wsCol.width = Math.min(Math.max(maxLen + 4, 12), 40);
    }
  });

  // --- Generate & download ---
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename.replace(/\.csv$/, '.xlsx'));
}

// Keep CSV as a simpler fallback (unused but available)
export function exportCsv(filename, columns, rows) {
  const escape = (val) => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = typeof c.key === 'function' ? c.key(row) : row[c.key];
      return escape(val);
    }).join(',')
  ).join('\n');

  const csv = header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
