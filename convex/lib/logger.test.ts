import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, sanitize, withError } from "./logger";

describe("createLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with debug, info, warn, error methods", () => {
    const logger = createLogger("test");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("debug calls console.log with formatted message", () => {
    const logger = createLogger("mymodule", { minLevel: "debug" });
    logger.debug("scope", "something happened");
    expect(console.log).toHaveBeenCalledWith("[mymodule] [DEBUG] scope: something happened");
  });

  it("info calls console.log with formatted message", () => {
    const logger = createLogger("mymodule");
    logger.info("scope", "all good");
    expect(console.log).toHaveBeenCalledWith("[mymodule] [INFO] scope: all good");
  });

  it("warn calls console.warn with formatted message", () => {
    const logger = createLogger("mymodule");
    logger.warn("scope", "heads up");
    expect(console.warn).toHaveBeenCalledWith("[mymodule] [WARN] scope: heads up");
  });

  it("error calls console.error with formatted message", () => {
    const logger = createLogger("mymodule");
    logger.error("scope", "something broke");
    expect(console.error).toHaveBeenCalledWith("[mymodule] [ERROR] scope: something broke");
  });

  it("includes meta as JSON in the output", () => {
    const logger = createLogger("mymodule");
    logger.info("scope", "with data", { count: 42 });
    expect(console.log).toHaveBeenCalledWith('[mymodule] [INFO] scope: with data {"count":42}');
  });

  it("handles empty scope", () => {
    const logger = createLogger("mymodule");
    logger.info("", "no scope");
    expect(console.log).toHaveBeenCalledWith("[mymodule] [INFO] no scope");
  });
});

describe("sanitize", () => {
  it("redacts strings containing sk-", () => {
    expect(sanitize("sk-abc123secret")).toBe("[REDACTED]");
  });

  it("redacts strings containing AKIA", () => {
    expect(sanitize("AKIAIOSFODNN7EXAMPLE")).toBe("[REDACTED]");
  });

  it("redacts strings containing ghp_", () => {
    expect(sanitize("ghp_abc123def456")).toBe("[REDACTED]");
  });

  it("redacts JWT-like strings starting with eyJ", () => {
    expect(sanitize("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123")).toBe("[REDACTED]");
  });

  it("passes through normal strings unchanged", () => {
    expect(sanitize("hello world")).toBe("hello world");
    expect(sanitize("user@example.com")).toBe("user@example.com");
    expect(sanitize("no-secrets-here")).toBe("no-secrets-here");
  });

  it("passes through non-string values unchanged", () => {
    expect(sanitize(42)).toBe(42);
    expect(sanitize(null)).toBe(null);
    expect(sanitize(undefined)).toBe(undefined);
    expect(sanitize({ key: "value" })).toEqual({ key: "value" });
  });
});

describe("withError", () => {
  it("returns error message for Error objects", () => {
    const result = withError(new Error("something failed"));
    expect(result).toEqual({ error: "something failed" });
  });

  it("returns string representation for unknown inputs", () => {
    expect(withError("string error")).toEqual({ error: "string error" });
  });

  it("returns string representation for numbers", () => {
    expect(withError(404)).toEqual({ error: "404" });
  });

  it("returns string representation for null", () => {
    expect(withError(null)).toEqual({ error: "null" });
  });

  it("returns string representation for undefined", () => {
    expect(withError(undefined)).toEqual({ error: "undefined" });
  });

  it("returns string representation for objects", () => {
    expect(withError({ code: 500 })).toEqual({ error: "[object Object]" });
  });
});
