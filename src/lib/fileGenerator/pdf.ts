import { jsPDF } from 'jspdf';
import type { FileContent } from './types';

export async function generatePDF(file: FileContent): Promise<Blob> {
  const doc = new jsPDF();

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(file.title, 20, 30);

  if (file.metadata) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let y = 45;
    for (const [key, value] of Object.entries(file.metadata)) {
      doc.text(`${key}: ${value}`, 20, y);
      y += 6;
    }
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(file.content, 170);
  let y = file.metadata ? 60 : 50;

  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 20, y);
    y += 6;
  }

  if (file.sections) {
    for (const section of file.sections) {
      doc.addPage();
      y = 30;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(section.heading, 20, y);
      y += 12;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const sectionLines = doc.splitTextToSize(section.content, 170);
      for (const line of sectionLines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 6;
      }
    }
  }

  if (file.tables) {
    for (const table of file.tables) {
      doc.addPage();
      y = 30;

      const colWidth = 170 / table.headers.length;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      table.headers.forEach((header, i) => {
        doc.text(header, 20 + (i * colWidth), y);
      });
      y += 8;

      doc.setFont('helvetica', 'normal');
      for (const row of table.rows) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        row.forEach((cell, i) => {
          doc.text(cell, 20 + (i * colWidth), y);
        });
        y += 6;
      }
    }
  }

  return doc.output('blob');
}
