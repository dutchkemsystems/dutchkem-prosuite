import ExcelJS from 'exceljs';
import type { FileContent } from './types';

export async function generateXLSX(file: FileContent): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dutchkem Ventures ProSuite';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(file.title.substring(0, 31));

  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = file.title;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  if (file.metadata) {
    let row = 3;
    for (const [key, value] of Object.entries(file.metadata)) {
      sheet.getCell(`A${row}`).value = key;
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = value;
      row++;
    }
  }

  const contentStartRow = file.metadata ? Object.keys(file.metadata).length + 5 : 3;
  sheet.getCell(`A${contentStartRow}`).value = 'Content';
  sheet.getCell(`A${contentStartRow}`).font = { bold: true, size: 12 };

  const contentLines = file.content.split('\n').filter(l => l.trim());
  contentLines.forEach((line, i) => {
    sheet.getCell(`A${contentStartRow + 1 + i}`).value = line;
  });

  if (file.tables) {
    file.tables.forEach((table, tableIndex) => {
      const tableSheet = workbook.addWorksheet(`Table ${tableIndex + 1}`);

      table.headers.forEach((header, i) => {
        const cell = tableSheet.getCell(1, i + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });

      table.rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          tableSheet.getCell(rowIndex + 2, colIndex + 1).value = cell;
        });
      });

      table.headers.forEach((_: string, i: number) => {
        tableSheet.getColumn(i + 1).width = 20;
      });
    });
  }

  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 50;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
