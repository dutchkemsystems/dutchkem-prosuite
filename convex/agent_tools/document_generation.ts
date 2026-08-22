import { createTool } from "@convex-dev/agent";
import { v } from "convex/values";
import { convexSchema } from "./_helper";

// ─────────────────────────────────────────────────────────
// Document Generation — PDF & DOCX
// ─────────────────────────────────────────────────────────

/**
 * Tool 1: Generate a PDF document from structured content
 */
export const generatePDFTool = createTool({
  description: "Generate a professional PDF document from structured content. Use this when the user asks for a PDF, report, document, or downloadable file. Returns a base64-encoded PDF string.",
  title: "Generate PDF",
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
    pdfBase64: v.optional(v.string()),
    fileName: v.string(),
    error: v.optional(v.string()),
  })),
  execute: async (ctx, input) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Title
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(input.title, 20, 30);

      // Metadata
      if (input.metadata) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        let y = 45;
        for (const [key, value] of Object.entries(input.metadata)) {
          doc.text(`${key}: ${value}`, 20, y);
          y += 6;
        }
      }

      // Main content
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(input.content, 170);
      let y = input.metadata ? 60 : 50;

      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 6;
      }

      // Sections
      if (input.sections) {
        for (const section of input.sections) {
          doc.addPage();
          y = 30;

          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text(section.heading, 20, y);
          y += 12;

          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
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

      const pdfBase64 = doc.output("datauristring").split(",")[1];
      const fileName = `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      return {
        success: true,
        pdfBase64,
        fileName,
      };
    } catch (error: any) {
      return {
        success: false,
        fileName: `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
        error: error.message,
      };
    }
  },
});

/**
 * Tool 2: Generate a Word document (DOCX) from structured content
 */
export const generateDOCXTool = createTool({
  description: "Generate a professional Word document (DOCX) from structured content. Use this when the user asks for a Word document, .docx file, or professional document format.",
  title: "Generate DOCX",
  inputSchema: convexSchema(v.object({
    title: v.string(),
    content: v.string(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    docxBase64: v.optional(v.string()),
    fileName: v.string(),
    error: v.optional(v.string()),
  })),
  execute: async (ctx, input) => {
    try {
      const docx = await import("docx");
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

      const children: any[] = [];

      // Title
      children.push(new Paragraph({
        children: [new TextRun({ text: input.title, bold: true, size: 48 })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }));

      // Main content
      const paragraphs = input.content.split("\n").filter((p) => p.trim());
      for (const para of paragraphs) {
        children.push(new Paragraph({
          children: [new TextRun({ text: para, size: 24 })],
          spacing: { after: 200 },
        }));
      }

      // Sections
      if (input.sections) {
        for (const section of input.sections) {
          children.push(new Paragraph({
            children: [new TextRun({ text: section.heading, bold: true, size: 32 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }));

          const sectionParagraphs = section.content.split("\n").filter((p) => p.trim());
          for (const para of sectionParagraphs) {
            children.push(new Paragraph({
              children: [new TextRun({ text: para, size: 24 })],
              spacing: { after: 200 },
            }));
          }
        }
      }

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const buffer = await Packer.toBuffer(doc);
      const docxBase64 = Buffer.from(buffer).toString("base64");
      const fileName = `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;

      return {
        success: true,
        docxBase64,
        fileName,
      };
    } catch (error: any) {
      return {
        success: false,
        fileName: `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`,
        error: error.message,
      };
    }
  },
});
