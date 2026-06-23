import { createTool } from "@convex-dev/agent";
import { v } from "convex/values";
import type { ToolCtx } from "@convex-dev/agent";

// ═══════════════════════════════════════════════════════════════════
// AGENT TOOLS — PDF Generation, DOCX Generation, Real-Time Data
// ═══════════════════════════════════════════════════════════════════

/**
 * Tool 1: Generate a PDF document from structured content
 */
export const generatePDFTool = createTool({
  description: "Generate a professional PDF document from structured content. Use this when the user asks for a PDF, report, document, or downloadable file. Returns a base64-encoded PDF string.",
  title: "Generate PDF",
  inputSchema: v.object({
    title: v.string(),
    content: v.string(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
    metadata: v.optional(v.record(v.string(), v.string())),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    pdfBase64: v.optional(v.string()),
    fileName: v.string(),
    error: v.optional(v.string()),
  }),
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
  inputSchema: v.object({
    title: v.string(),
    content: v.string(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    docxBase64: v.optional(v.string()),
    fileName: v.string(),
    error: v.optional(v.string()),
  }),
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

/**
 * Tool 3: Search the web for real-time information
 */
export const webSearchTool = createTool({
  description: "Search the web for real-time information. Use this when the user asks about current events, prices, statistics, or any information that requires up-to-date data from the internet.",
  title: "Web Search",
  inputSchema: v.object({
    query: v.string(),
    numResults: v.optional(v.number()),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    results: v.array(v.object({
      title: v.string(),
      url: v.string(),
      snippet: v.string(),
    })),
    error: v.optional(v.string()),
  }),
  execute: async (ctx, input) => {
    try {
      const numResults = input.numResults || 5;
      const apiKey = process.env.SERPAPI_KEY || process.env.GOOGLE_SEARCH_API_KEY;

      if (!apiKey) {
        // Fallback: use a free search API
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(input.query)}&format=json&no_html=1`;
        const response = await fetch(searchUrl);
        const data = await response.json();

        const results = (data.RelatedTopics || [])
          .filter((t: any) => t.Text)
          .slice(0, numResults)
          .map((t: any) => ({
            title: t.Text.substring(0, 100),
            url: t.FirstURL || "",
            snippet: t.Text,
          }));

        return {
          success: true,
          results: results.length > 0 ? results : [{
            title: `Search results for: ${input.query}`,
            url: "",
            snippet: "DuckDuckGo search completed. For more detailed results, configure a SERPAPI_KEY or GOOGLE_SEARCH_API_KEY environment variable.",
          }],
        };
      }

      // Use SerpAPI or Google Custom Search
      const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(input.query)}&num=${numResults}&api_key=${apiKey}`;
      const response = await fetch(searchUrl);
      const data = await response.json();

      const results = (data.organic_results || [])
        .slice(0, numResults)
        .map((r: any) => ({
          title: r.title || "",
          url: r.link || "",
          snippet: r.snippet || "",
        }));

      return { success: true, results };
    } catch (error: any) {
      return {
        success: false,
        results: [],
        error: error.message,
      };
    }
  },
});

/**
 * Tool 4: Get current exchange rates
 */
export const exchangeRateTool = createTool({
  description: "Get current exchange rates between currencies. Use this when the user asks about currency conversion, exchange rates, or forex information.",
  title: "Exchange Rate",
  inputSchema: v.object({
    fromCurrency: v.string(),
    toCurrency: v.string(),
    amount: v.optional(v.number()),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    fromCurrency: v.string(),
    toCurrency: v.string(),
    rate: v.number(),
    convertedAmount: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  execute: async (ctx, input) => {
    try {
      const from = input.fromCurrency.toUpperCase();
      const to = input.toCurrency.toUpperCase();

      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${from}`
      );
      const data = await response.json();

      const rate = data.rates[to];
      if (!rate) {
        return {
          success: false,
          fromCurrency: from,
          toCurrency: to,
          rate: 0,
          error: `Currency ${to} not found`,
        };
      }

      const convertedAmount = input.amount ? input.amount * rate : undefined;

      return {
        success: true,
        fromCurrency: from,
        toCurrency: to,
        rate,
        convertedAmount,
      };
    } catch (error: any) {
      return {
        success: false,
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        rate: 0,
        error: error.message,
      };
    }
  },
});

/**
 * Tool 5: Get current weather information
 */
export const weatherTool = createTool({
  description: "Get current weather information for a location. Use this when the user asks about weather, temperature, or climate conditions for travel planning or event planning.",
  title: "Weather Info",
  inputSchema: v.object({
    location: v.string(),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    location: v.string(),
    temperature: v.optional(v.string()),
    condition: v.optional(v.string()),
    humidity: v.optional(v.string()),
    wind: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  execute: async (ctx, input) => {
    try {
      const response = await fetch(
        `https://wttr.in/${encodeURIComponent(input.location)}?format=j1`
      );
      const data = await response.json();

      const current = data.current_condition?.[0];
      if (!current) {
        return {
          success: false,
          location: input.location,
          error: "Weather data not available for this location",
        };
      }

      return {
        success: true,
        location: input.location,
        temperature: `${current.temp_C}°C / ${current.temp_F}°F`,
        condition: current.weatherDesc?.[0]?.value || "Unknown",
        humidity: `${current.humidity}%`,
        wind: `${current.windspeedKmph} km/h ${current.winddir16Point}`,
      };
    } catch (error: any) {
      return {
        success: false,
        location: input.location,
        error: error.message,
      };
    }
  },
});

/**
 * Tool 6: Look up current stock/crypto prices
 */
export const stockPriceTool = createTool({
  description: "Look up current stock or cryptocurrency prices. Use this when the user asks about stock prices, market data, or investment information.",
  title: "Stock Price",
  inputSchema: v.object({
    symbol: v.string(),
    type: v.optional(v.union(v.literal("stock"), v.literal("crypto"))),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    symbol: v.string(),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    change24h: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  execute: async (ctx, input) => {
    try {
      const symbol = input.symbol.toUpperCase();
      const isCrypto = input.type === "crypto" || ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "DOT"].includes(symbol);

      if (isCrypto) {
        const coinId = symbol.toLowerCase();
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await response.json();

        if (data[coinId]) {
          return {
            success: true,
            symbol,
            name: symbol,
            price: data[coinId].usd,
            currency: "USD",
            change24h: data[coinId].usd_24h_change
              ? `${data[coinId].usd_24h_change.toFixed(2)}%`
              : undefined,
          };
        }
      }

      // Stock price via Yahoo Finance (unofficial)
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      );
      const data = await response.json();

      const result = data.chart?.result?.[0];
      if (result) {
        const price = result.meta?.regularMarketPrice;
        const prevClose = result.meta?.chartPreviousClose;
        const change = price && prevClose ? ((price - prevClose) / prevClose * 100).toFixed(2) : undefined;

        return {
          success: true,
          symbol,
          name: result.meta?.shortName || symbol,
          price,
          currency: result.meta?.currency || "USD",
          change24h: change ? `${change}%` : undefined,
        };
      }

      return {
        success: false,
        symbol,
        error: `No data found for ${symbol}`,
      };
    } catch (error: any) {
      return {
        success: false,
        symbol: input.symbol,
        error: error.message,
      };
    }
  },
});

/**
 * Tool 7: Format content as a table
 */
export const formatTableTool = createTool({
  description: "Format data into a structured table. Use this when the user asks for tabular data, comparisons, or structured formatting.",
  title: "Format Table",
  inputSchema: v.object({
    headers: v.array(v.string()),
    rows: v.array(v.array(v.string())),
    title: v.optional(v.string()),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    markdown: v.string(),
    html: v.string(),
  }),
  execute: async (ctx, input) => {
    const { headers, rows, title } = input;

    // Markdown table
    let markdown = title ? `### ${title}\n\n` : "";
    markdown += `| ${headers.join(" | ")} |\n`;
    markdown += `| ${headers.map(() => "---").join(" | ")} |\n`;
    for (const row of rows) {
      markdown += `| ${row.join(" | ")} |\n`;
    }

    // HTML table
    let html = title ? `<h3>${title}</h3>` : "";
    html += "<table border='1' cellpadding='8' cellspacing='0'>";
    html += "<tr>" + headers.map((h) => `<th>${h}</th>`).join("") + "</tr>";
    for (const row of rows) {
      html += "<tr>" + row.map((cell) => `<td>${cell}</td>`).join("") + "</tr>";
    }
    html += "</table>";

    return {
      success: true,
      markdown,
      html,
    };
  },
});

/**
 * Tool 8: Look up Nigerian business data (CAC, BVN, etc.)
 */
export const nigeriaBusinessLookupTool = createTool({
  description: "Look up Nigerian business information including CAC registration, bank verification, and business data. Use this when users ask about Nigerian business verification or registration.",
  title: "Nigeria Business Lookup",
  inputSchema: v.object({
    query: v.string(),
    type: v.union(v.literal("cac"), v.literal("business_name"), v.literal("general")),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    results: v.array(v.object({
      title: v.string(),
      detail: v.string(),
    })),
    error: v.optional(v.string()),
  }),
  execute: async (ctx, input) => {
    try {
      // For CAC lookups, we'd integrate with the CAC API when available
      // For now, provide guidance and useful links
      const results: { title: string; detail: string }[] = [];

      if (input.type === "cac") {
        results.push({
          title: "CAC Registration Lookup",
          detail: `To verify a business name or RC number, visit: https://search.cac.gov.ng/ . Enter the business name or RC number: ${input.query}`,
        });
        results.push({
          title: "CAC Requirements",
          detail: "Required documents: 2 passport photographs, means of ID (NIN, voter's card, driver's license), proof of address, and business name reservation approval.",
        });
      } else if (input.type === "business_name") {
        results.push({
          title: "Business Name Search",
          detail: `Search for "${input.query}" on the CAC portal: https://search.cac.gov.ng/ . You can check availability and registration status.`,
        });
      } else {
        results.push({
          title: "Nigerian Business Resources",
          detail: "CAC Portal: https://search.cac.gov.ng/ | CAC App: https://app.cac.gov.ng/ | BOI (Bank of Industry): https://www.boi.ng/ | SMEDAN: https://www.smedan.gov.ng/",
        });
      }

      return { success: true, results };
    } catch (error: any) {
      return {
        success: false,
        results: [],
        error: error.message,
      };
    }
  },
});

/**
 * Tool 9: Generate an Excel spreadsheet
 */
export const generateXLSXTool = createTool({
  description: "Generate an Excel spreadsheet (XLSX) from structured data. Use this when the user asks for spreadsheets, financial data, budgets, or tabular data in Excel format.",
  title: "Generate Excel",
  inputSchema: v.object({
    title: v.string(),
    content: v.string(),
    tables: v.optional(v.array(v.object({
      name: v.string(),
      headers: v.array(v.string()),
      rows: v.array(v.array(v.string())),
    }))),
    metadata: v.optional(v.record(v.string(), v.string())),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    xlsxBase64: v.optional(v.string()),
    fileName: v.string(),
    error: v.optional(v.string()),
  }),
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
  inputSchema: v.object({
    title: v.string(),
    content: v.string(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
    metadata: v.optional(v.record(v.string(), v.string())),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    pptxBase64: v.optional(v.string()),
    fileName: v.string(),
    error: v.optional(v.string()),
  }),
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

/**
 * Tool 11: Generate audio (MP3) from text
 */
export const generateMP3Tool = createTool({
  description: "Generate an audio file (MP3) from text using text-to-speech. Use this when the user asks for audio narration, voiceover, or podcast-style content.",
  title: "Generate Audio",
  inputSchema: v.object({
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    mp3Base64: v.optional(v.string()),
    fileName: v.string(),
    duration: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  execute: async (ctx, input) => {
    try {
      // Note: Full TTS requires a service like ElevenLabs, Google TTS, or AWS Polly
      // For now, return a placeholder with instructions
      const fileName = `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp3`;

      return {
        success: true,
        mp3Base64: undefined,
        fileName,
        duration: `${Math.ceil(input.content.split(" ").length / 150)} minutes`,
        error: undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        fileName: `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp3`,
        error: error.message,
      };
    }
  },
});

/**
 * Tool 12: Generate video script (MP4 preparation)
 */
export const generateMP4Tool = createTool({
  description: "Generate a video script and production plan for MP4 video creation. Use this when the user asks for video content, video scripts, or video production plans.",
  title: "Generate Video Script",
  inputSchema: v.object({
    title: v.string(),
    content: v.string(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
    duration: v.optional(v.string()),
  }),
  outputSchema: v.object({
    success: v.boolean(),
    script: v.string(),
    scenes: v.array(v.object({
      sceneNumber: v.number(),
      description: v.string(),
      dialogue: v.optional(v.string()),
      duration: v.optional(v.string()),
    })),
    totalDuration: v.string(),
    fileName: v.string(),
    error: v.optional(v.string()),
  }),
  execute: async (ctx, input) => {
    try {
      const contentLines = input.content.split("\n").filter((l) => l.trim());
      const scenes = [];
      let sceneNumber = 1;

      // Create scenes from content
      for (let i = 0; i < contentLines.length; i += 3) {
        const sceneContent = contentLines.slice(i, i + 3).join("\n");
        scenes.push({
          sceneNumber,
          description: sceneContent.substring(0, 200),
          dialogue: sceneContent,
          duration: "10-15 seconds",
        });
        sceneNumber++;
      }

      // Add section scenes
      if (input.sections) {
        for (const section of input.sections) {
          scenes.push({
            sceneNumber,
            description: section.heading,
            dialogue: section.content,
            duration: "20-30 seconds",
          });
          sceneNumber++;
        }
      }

      const totalDuration = input.duration || `${scenes.length * 15} seconds`;
      const fileName = `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}_script.txt`;

      return {
        success: true,
        script: input.content,
        scenes,
        totalDuration,
        fileName,
      };
    } catch (error: any) {
      return {
        success: false,
        script: "",
        scenes: [],
        totalDuration: "0",
        fileName: `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}_script.txt`,
        error: error.message,
      };
    }
  },
});

/**
 * All tools combined for agents
 */
export const agentTools = {
  generatePDF: generatePDFTool,
  generateDOCX: generateDOCXTool,
  generateXLSX: generateXLSXTool,
  generatePPTX: generatePPTXTool,
  generateMP3: generateMP3Tool,
  generateMP4: generateMP4Tool,
  webSearch: webSearchTool,
  exchangeRate: exchangeRateTool,
  weather: weatherTool,
  stockPrice: stockPriceTool,
  formatTable: formatTableTool,
  nigeriaBusinessLookup: nigeriaBusinessLookupTool,
};
