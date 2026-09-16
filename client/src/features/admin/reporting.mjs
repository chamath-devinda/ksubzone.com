export function csvText(rows) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}

export function selectTraffic(logs, days, today = new Date()) {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  const lo = start.toISOString().slice(0, 10), hi = end.toISOString().slice(0, 10);
  return (Array.isArray(logs) ? logs : []).filter(log => log.date >= lo && log.date <= hi)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function downloadCsv(filename, rows) {
  const url = URL.createObjectURL(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPng(filename, title, rows) {
  const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 180 + rows.length * 42;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image export unavailable');
  ctx.fillStyle = '#10151c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#edf2f7'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(title, 40, 60);
  ctx.font = '18px sans-serif';
  rows.forEach((row, index) => row.forEach((value, column) => {
    ctx.fillStyle = index === 0 ? '#60A5FA' : '#F5F6F8';
    ctx.fillText(String(value ?? '—'), 40 + column * (1320 / row.length), 120 + index * 42, 1280 / row.length);
  }));
  const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = filename; link.click();
}
