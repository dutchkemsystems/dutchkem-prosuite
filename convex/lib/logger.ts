/**
 * Structured logger for Convex functions.
 *
 * Lightweight wrapper around console that adds consistent prefixing, a
 * severity level, and structured (key-value) context. Additive only —
 * existing `console.*` calls across the codebase are untouched.
 *
 * Rules:
 * - No `btoa` / `crypto` usage here.
 * - Safe to call from queries, mutations, actions, and crons.
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

let sentryRef: { captureException?: (e: unknown, h?: Record<string, unknown>) => void; captureMessage?: (m: string, h?: Record<string, unknown>) => void } | null = null

/**
 * Optionally attaches Sentry as an error sink. Imported lazily so the
 * logger stays safe in edge-runtime / test environments where the
 * Sentry SDK may not be installed.
 */
export function initLoggerSentry(dsn?: string): void {
  if (!dsn || sentryRef) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node")
    Sentry.init({ dsn, tracesSampleRate: 0.1 })
    sentryRef = Sentry
  } catch {
    sentryRef = null
  }
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta) return ""
  try {
    return " " + JSON.stringify(meta)
  } catch {
    return ""
  }
}

function shouldLog(level: LogLevel, minLevel?: LogLevel): boolean {
  const configured = minLevel ?? (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info"
  return LEVEL_ORDER[level] >= (LEVEL_ORDER[configured] ?? LEVEL_ORDER.info)
}

export interface Logger {
  debug(scope: string, message: string, meta?: Record<string, unknown>): void
  info(scope: string, message: string, meta?: Record<string, unknown>): void
  warn(scope: string, message: string, meta?: Record<string, unknown>): void
  error(scope: string, message: string, meta?: Record<string, unknown>): void
}

export function createLogger(module: string, options?: { minLevel?: LogLevel }): Logger {
  const scoped = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (!shouldLog(level, options?.minLevel)) return
    const line = `[${module}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`
    switch (level) {
      case "debug":
        console.log(line)
        break
      case "info":
        console.log(line)
        break
      case "warn":
        console.warn(line)
        break
      case "error":
        console.error(line)
        if (sentryRef?.captureMessage) {
          sentryRef.captureMessage(`[${module}] ${message}`, { level: "error", extra: meta ?? {} })
        }
        break
    }
  }

  return {
    debug: (scope, message, meta) => scoped("debug", `${scope ? scope + ": " : ""}${message}`, meta),
    info: (scope, message, meta) => scoped("info", `${scope ? scope + ": " : ""}${message}`, meta),
    warn: (scope, message, meta) => scoped("warn", `${scope ? scope + ": " : ""}${message}`, meta),
    error: (scope, message, meta) => scoped("error", `${scope ? scope + ": " : ""}${message}`, meta),
  }
}

/** Sanitizes known secret-looking values before logging (e.g. keys/tokens). */
export function sanitize(value: unknown): unknown {
  if (typeof value !== "string") return value
  if (/(sk-|AKIA|ghp_|eyJ[A-Za-z0-9_-]{8,}\.)/.test(value)) return "[REDACTED]"
  return value
}

export function withError(e: unknown): { error: string } {
  return { error: e instanceof Error ? e.message : String(e) }
}