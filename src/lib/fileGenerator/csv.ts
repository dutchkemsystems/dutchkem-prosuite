import type { FileContent } from './types';

export function generateCSV(file: FileContent): Blob {
  let csv = '';

  csv += `"${file.title}"\n\n`;

  if (file.metadata) {
    for (const [key, value] of Object.entries(file.metadata)) {
      csv += `"${key}","${value}"\n`;
    }
    csv += '\n';
  }

  if (file.tables && file.tables.length > 0) {
    for (const table of file.tables) {
      csv += table.headers.map(h => `"${h}"`).join(',') + '\n';
      for (const row of table.rows) {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
      }
      csv += '\n';
    }
  } else {
    csv += '"Content"\n';
    const lines = file.content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      csv += `"${line.replace(/"/g, '""')}"\n`;
    }
  }

  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}
