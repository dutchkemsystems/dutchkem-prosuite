import type { FileContent } from './types';

export function generateTXT(file: FileContent): Blob {
  const separator = '='.repeat(file.title.length);
  const dashSeparator = '-'.repeat(20);
  let txt = file.title + '\n' + separator + '\n\n';

  if (file.metadata) {
    for (const [key, value] of Object.entries(file.metadata)) {
      txt += key + ': ' + value + '\n';
    }
    txt += '\n';
  }

  txt += file.content + '\n\n';

  if (file.sections) {
    for (const section of file.sections) {
      const sectionDash = '-'.repeat(section.heading.length);
      txt += '\n' + section.heading + '\n' + sectionDash + '\n';
      txt += section.content + '\n';
    }
  }

  if (file.tables) {
    for (const table of file.tables) {
      txt += '\n' + table.headers.join('\t') + '\n';
      txt += table.headers.map(() => '---').join('\t') + '\n';
      for (const row of table.rows) {
        txt += row.join('\t') + '\n';
      }
    }
  }

  return new Blob([txt], { type: 'text/plain;charset=utf-8;' });
}
