import { createTool } from "@convex-dev/agent";
import { v } from "convex/values";
import { convexSchema } from "./_helper";

// ─────────────────────────────────────────────────────────
// Spreadsheet & Presentation Generation — XLSX & PPTX
// ─────────────────────────────────────────────────────────

/**
 * Tool 9: Generate an Excel spreadsheet
 */
export const generateXLSXTool = createTool({
  description: "Generate an Excel spreadsheet (XLSX) from structured data. Use this when the user asks for spreadsheets, financial data, budgets, or tabular data in Excel format.",
  title: "Generate Excel",
  inputSchema: convexSchema(v.object({
    title: v.string(),
    content: v.string(),
    tables: v.optional(v.array(v.object({
      name: v.string(),
      headers: v.array(v.string()),
      rows: v.array(v.array(v.string())),
    }))),
    metadata: v.optional(v.record(v.string(), v.string())),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    xlsxBase64: v.optional(v.string()),
    fileName: v.string(),
    error: v.optional(v.string()),
  })),
  execute: async (ctx, input) => {
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      workbook.creator = "Dutchkem Ventures ProSuite";
      workbook.created = new Date();

      // Main sheet
      const sheet = workbook.addWorksheet(input.title.substring(0, 31));

      // Title row
      sheet.mergeCells("A1:F1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = input.title;
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: "center" };

      // Metadata
      if (input.metadata) {
        let row = 3;
        for (const [key, value] of Object.entries(input.metadata)) {
          sheet.getCell(`A${row}`).value = key;
          sheet.getCell(`A${row}`).font = { bold: true };
          sheet.getCell(`B${row}`).value = value;
          row++;
        }
      }

      // Content
      const contentStartRow = input.metadata ? Object.keys(input.metadata).length + 5 : 3;
      sheet.getCell(`A${contentStartRow}`).value = "Content";
      sheet.getCell(`A${contentStartRow}`).font = { bold: true, size: 12 };

      const contentLines = input.content.split("\n").filter((l) => l.trim());
      contentLines.forEach((line, i) => {
        sheet.getCell(`A${contentStartRow + 1 + i}`).value = line;
      });

      // Tables as separate sheets
      if (input.tables) {
        for (const table of input.tables) {
          const tableSheet = workbook.addWorksheet(table.name.substring(0, 31));

          // Headers
          table.headers.forEach((header, i) => {
            const cell = tableSheet.getCell(1, i + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
          });

          // Data rows
          table.rows.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
              tableSheet.getCell(rowIndex + 2, colIndex + 1).value = cell;
            });
          });

          // Auto-fit columns
          table.headers.forEach((_: string, i: number) => {
            tableSheet.getColumn(i + 1).width = 20;
          });
        }
      }

      sheet.getColumn(1).width = 30;
      sheet.getColumn(2).width = 50;

      const buffer = await workbook.xlsx.writeBuffer();
      const xlsxBase64 = Buffer.from(buffer).toString("base64");
      const fileName = `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;

      return { success: true, xlsxBase64, fileName };
    } catch (error: any) {
      return {
        success: false,
        fileName: `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
        error: error.message,
      };
    }
  },
});

/**
 * Tool 10: Generate a PowerPoint presentation
 */
export const generatePPTXTool = createTool({
  description: "Generate a PowerPoint presentation (PPTX) from structured content. Use this when the user asks for presentations, slide decks, or pitch decks.",
  title: "Generate PowerPoint",
  inputSchema: convexSchema(v.object({
    title: v.string(),
    content: v.string(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
    metadata: v.optional(v.record(v.string(), v.string())),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    pptxBase64: v.optional(v.string()),
    fileName: v.string(),
    error: v.optional(v.string()),
  })),
  execute: async (ctx, input) => {
    try {
      const PptxGenJS = await import("pptxgenjs");
      const pptx = new PptxGenJS.default();
      pptx.author = "Dutchkem Ventures ProSuite";
      pptx.title = input.title;

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: "1a1a2e" };
      titleSlide.addText(input.title, {
        x: "10%",
        y: "35%",
        w: "80%",
        h: "30%",
        fontSize: 36,
        fontFace: "Arial",
        color: "FFFFFF",
        bold: true,
        align: "center",
      });

      // Metadata slide
      if (input.metadata) {
        const metaSlide = pptx.addSlide();
        metaSlide.background = { color: "16213e" };
        metaSlide.addText("Document Information", {
          x: "10%",
          y: "10%",
          w: "80%",
          h: "15%",
          fontSize: 28,
          fontFace: "Arial",
          color: "FF6B35",
          bold: true,
        });

        let yPos = 30;
        for (const [key, value] of Object.entries(input.metadata)) {
          metaSlide.addText(`${key}: ${value}`, {
            x: "15%",
            y: `${yPos}%`,
            w: "70%",
            h: "8%",
            fontSize: 16,
            fontFace: "Arial",
            color: "CCCCCC",
          });
          yPos += 10;
        }
      }

      // Content slides
      const contentLines = input.content.split("\n").filter((l) => l.trim());
      const linesPerSlide = 8;

      for (let i = 0; i < contentLines.length; i += linesPerSlide) {
        const slide = pptx.addSlide();
        slide.background = { color: "0f3460" };

        const slideContent = contentLines.slice(i, i + linesPerSlide).join("\n");
        slide.addText(slideContent, {
          x: "10%",
          y: "15%",
          w: "80%",
          h: "70%",
          fontSize: 18,
          fontFace: "Arial",
          color: "FFFFFF",
          valign: "top",
          paraSpaceAfter: 12,
        });
      }

      // Section slides
      if (input.sections) {
        for (const section of input.sections) {
          const slide = pptx.addSlide();
          slide.background = { color: "1a1a2e" };

          slide.addText(section.heading, {
            x: "10%",
            y: "10%",
            w: "80%",
            h: "20%",
            fontSize: 32,
            fontFace: "Arial",
            color: "FF6B35",
            bold: true,
          });

          slide.addText(section.content, {
            x: "10%",
            y: "35%",
            w: "80%",
            h: "55%",
            fontSize: 16,
            fontFace: "Arial",
            color: "FFFFFF",
            valign: "top",
          });
        }
      }

      const pptxBuffer = await pptx.write({ outputType: "base64" });
      const fileName = `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.pptx`;

      return {
        success: true,
        pptxBase64: pptxBuffer as string,
        fileName,
      };
    } catch (error: any) {
      return {
        success: false,
        fileName: `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.pptx`,
        error: error.message,
      };
    }
  },
});
