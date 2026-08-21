/**
 * Shared error types and codes for Convex functions.
 *
 * Edge-runtime safe: no Node-API or native package imports.
 * Use these standardized codes across mutations, queries, and actions
 * so that callers can pattern-match on error codes rather than strings.
 */

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status: number = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const ErrorCodes = {
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  TIMEOUT: "TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const ErrorStatusMap: Record<ErrorCode, number> = {
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.INSUFFICIENT_BALANCE]: 422,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.EXTERNAL_API_ERROR]: 502,
  [ErrorCodes.TIMEOUT]: 504,
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 500,
};

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message, 500, { originalError: error.name });
  }
  return new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, "An unexpected error occurred", 500);
}
