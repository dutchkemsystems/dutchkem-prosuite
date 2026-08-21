import type { FileContent } from './types';

export function generateJSON(file: FileContent): Blob {
  const jsonData = {
    title: file.title,
    metadata: file.metadata || {},
    content: file.content,
    sections: file.sections || [],
    tables: file.tables || [],
    generatedAt: new Date().toISOString(),
    generatedBy: 'Dutchkem Ventures ProSuite AI',
  };

  return new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
}
