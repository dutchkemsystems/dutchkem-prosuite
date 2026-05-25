import ePub from 'epub-gen';

export async function generateEpub(title, author, content, outputPath) {
  const options = {
    title,
    author,
    output: outputPath,
    content: [
      {
        title: 'Chapter 1',
        data: `<h1>${title}</h1><p>${content.replace(/\n/g, '</p><p>')}</p>`,
      },
    ],
  };
  return await ePub(options);
}

export function generatePdfContent(manuscript) {
  const escaped = manuscript.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: serif; max-width: 600px; margin: auto; padding: 40px; line-height: 1.6; }
  h1 { font-size: 24px; text-align: center; margin-bottom: 30px; }
  p { text-indent: 1.5em; margin: 0.5em 0; }
</style></head><body>
<h1>${title}</h1>
${escaped.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n')}
</body></html>`;
}

export function generateMobiContent(epubBuffer) {
  // MOBI generation requires kindlegen or calibre CLI in production.
  // For now we return the EPUB buffer as a placeholder.
  return epubBuffer;
}
