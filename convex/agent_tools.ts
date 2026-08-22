// ─────────────────────────────────────────────────────────
// AGENT TOOLS — Barrel Re-Export
// Sub-modules under convex/agent_tools/
// ─────────────────────────────────────────────────────────

export {
  generatePDFTool,
  generateDOCXTool,
} from "./agent_tools/document_generation";

export {
  generateXLSXTool,
  generatePPTXTool,
} from "./agent_tools/spreadsheet_presentation";

export {
  webSearchTool,
  exchangeRateTool,
  weatherTool,
  stockPriceTool,
} from "./agent_tools/real_time_data";

export {
  formatTableTool,
  nigeriaBusinessLookupTool,
  generateMP3Tool,
  generateMP4Tool,
} from "./agent_tools/misc_tools";

import { generatePDFTool } from "./agent_tools/document_generation";
import { generateDOCXTool } from "./agent_tools/document_generation";
import { generateXLSXTool } from "./agent_tools/spreadsheet_presentation";
import { generatePPTXTool } from "./agent_tools/spreadsheet_presentation";
import { webSearchTool } from "./agent_tools/real_time_data";
import { exchangeRateTool } from "./agent_tools/real_time_data";
import { weatherTool } from "./agent_tools/real_time_data";
import { stockPriceTool } from "./agent_tools/real_time_data";
import { formatTableTool } from "./agent_tools/misc_tools";
import { nigeriaBusinessLookupTool } from "./agent_tools/misc_tools";
import { generateMP3Tool } from "./agent_tools/misc_tools";
import { generateMP4Tool } from "./agent_tools/misc_tools";

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
