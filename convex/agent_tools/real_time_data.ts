import { createTool } from "@convex-dev/agent";
import { v } from "convex/values";
import { convexSchema } from "./_helper";

// ─────────────────────────────────────────────────────────
// Real-Time Data — Web Search, Exchange Rates, Weather, Stocks
// ─────────────────────────────────────────────────────────

/**
 * Tool 3: Search the web for real-time information
 */
export const webSearchTool = createTool({
  description: "Search the web for real-time information. Use this when the user asks about current events, prices, statistics, or any information that requires up-to-date data from the internet.",
  title: "Web Search",
  inputSchema: convexSchema(v.object({
    query: v.string(),
    numResults: v.optional(v.number()),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    results: v.array(v.object({
      title: v.string(),
      url: v.string(),
      snippet: v.string(),
    })),
    error: v.optional(v.string()),
  })),
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
  inputSchema: convexSchema(v.object({
    fromCurrency: v.string(),
    toCurrency: v.string(),
    amount: v.optional(v.number()),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    fromCurrency: v.string(),
    toCurrency: v.string(),
    rate: v.number(),
    convertedAmount: v.optional(v.number()),
    error: v.optional(v.string()),
  })),
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
  inputSchema: convexSchema(v.object({
    location: v.string(),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    location: v.string(),
    temperature: v.optional(v.string()),
    condition: v.optional(v.string()),
    humidity: v.optional(v.string()),
    wind: v.optional(v.string()),
    error: v.optional(v.string()),
  })),
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
        temperature: `${current.temp_C}Â°C / ${current.temp_F}Â°F`,
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
  inputSchema: convexSchema(v.object({
    symbol: v.string(),
    type: v.optional(v.union(v.literal("stock"), v.literal("crypto"))),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    symbol: v.string(),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    change24h: v.optional(v.string()),
    error: v.optional(v.string()),
  })),
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
