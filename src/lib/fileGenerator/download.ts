import type { FileType } from './types';

export function downloadFile(blob: Blob, filename: string, type: FileType) {
  const extensions: Record<FileType, string> = {
    pdf: '.pdf',
    docx: '.docx',
    xlsx: '.xlsx',
    pptx: '.pptx',
    csv: '.csv',
    txt: '.txt',
    json: '.json',
    mp3: '.mp3',
    mp4: '.mp4',
  };

  const mimeTypes: Record<FileType, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    txt: 'text/plain',
    json: 'application/json',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
  };

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + extensions[type];
  a.type = mimeTypes[type];
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
