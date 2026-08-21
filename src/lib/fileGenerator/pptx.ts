import PptxGenJS from 'pptxgenjs';
import type { FileContent } from './types';

export async function generatePPTX(file: FileContent): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.author = 'Dutchkem Ventures ProSuite';
  pptx.title = file.title;

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '1a1a2e' };
  titleSlide.addText(file.title, {
    x: '10%',
    y: '35%',
    w: '80%',
    h: '30%',
    fontSize: 36,
    fontFace: 'Arial',
    color: 'FFFFFF',
    bold: true,
    align: 'center',
  });

  if (file.metadata) {
    const metaSlide = pptx.addSlide();
    metaSlide.background = { color: '16213e' };
    metaSlide.addText('Document Information', {
      x: '10%',
      y: '10%',
      w: '80%',
      h: '15%',
      fontSize: 28,
      fontFace: 'Arial',
      color: 'FF6B35',
      bold: true,
    });

    let yPos = 30;
    for (const [key, value] of Object.entries(file.metadata)) {
      metaSlide.addText(`${key}: ${value}`, {
        x: '15%',
        y: `${yPos}%`,
        w: '70%',
        h: '8%',
        fontSize: 16,
        fontFace: 'Arial',
        color: 'CCCCCC',
      });
      yPos += 10;
    }
  }

  const contentLines = file.content.split('\n').filter(l => l.trim());
  const linesPerSlide = 8;

  for (let i = 0; i < contentLines.length; i += linesPerSlide) {
    const slide = pptx.addSlide();
    slide.background = { color: '0f3460' };

    const slideContent = contentLines.slice(i, i + linesPerSlide).join('\n');
    slide.addText(slideContent, {
      x: '10%',
      y: '15%',
      w: '80%',
      h: '70%',
      fontSize: 18,
      fontFace: 'Arial',
      color: 'FFFFFF',
      valign: 'top',
      paraSpaceAfter: 12,
    });
  }

  if (file.sections) {
    for (const section of file.sections) {
      const slide = pptx.addSlide();
      slide.background = { color: '1a1a2e' };

      slide.addText(section.heading, {
        x: '10%',
        y: '10%',
        w: '80%',
        h: '20%',
        fontSize: 32,
        fontFace: 'Arial',
        color: 'FF6B35',
        bold: true,
      });

      slide.addText(section.content, {
        x: '10%',
        y: '35%',
        w: '80%',
        h: '55%',
        fontSize: 16,
        fontFace: 'Arial',
        color: 'FFFFFF',
        valign: 'top',
      });
    }
  }

  if (file.tables) {
    for (const table of file.tables) {
      const slide = pptx.addSlide();
      slide.background = { color: '16213e' };

      const tableRows = [
        table.headers.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: 'FF6B35' } } })),
        ...table.rows.map(row => row.map(cell => ({ text: cell, options: { color: '333333' } }))),
      ];

      slide.addTable(tableRows, {
        x: '5%',
        y: '15%',
        w: '90%',
        h: '70%',
        fontSize: 12,
        fontFace: 'Arial',
        border: { pt: 1, color: 'CCCCCC' },
        colW: Array(table.headers.length).fill(90 / table.headers.length),
      });
    }
  }

  const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
