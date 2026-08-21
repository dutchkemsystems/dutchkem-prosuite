import { describe, it, expect } from "vitest";
import { AppError, ErrorCodes, ErrorStatusMap, toAppError } from "./errors";

describe("AppError", () => {
  it("has correct name, code, status, and message", () => {
    const err = new AppError(ErrorCodes.VALIDATION_ERROR, "bad input", 400, { field: "email" });
    expect(err.name).toBe("AppError");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.status).toBe(400);
    expect(err.message).toBe("bad input");
    expect(err.details).toEqual({ field: "email" });
  });

  it("defaults status to 500 when not provided", () => {
    const err = new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, "something broke");
    expect(err.status).toBe(500);
  });

  it("is an instance of Error", () => {
    const err = new AppError(ErrorCodes.NOT_FOUND, "nope");
    expect(err).toBeInstanceOf(Error);
  });

  it("has undefined details when not provided", () => {
    const err = new AppError(ErrorCodes.TIMEOUT, "timed out");
    expect(err.details).toBeUndefined();
  });
});

describe("ErrorCodes", () => {
  it("has all expected codes", () => {
    const expected = [
      "INTERNAL_SERVER_ERROR",
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "CONFLICT",
      "RATE_LIMITED",
      "INSUFFICIENT_BALANCE",
      "EXTERNAL_API_ERROR",
      "TIMEOUT",
    ];
    for (const code of expected) {
      expect(ErrorCodes).toHaveProperty(code);
    }
  });
});

describe("ErrorStatusMap", () => {
  it("maps every ErrorCode to a numeric status", () => {
    for (const code of Object.values(ErrorCodes)) {
      expect(typeof ErrorStatusMap[code]).toBe("number");
    }
  });

  it("maps VALIDATION_ERROR to 400", () => {
    expect(ErrorStatusMap[ErrorCodes.VALIDATION_ERROR]).toBe(400);
  });

  it("maps UNAUTHORIZED to 401", () => {
    expect(ErrorStatusMap[ErrorCodes.UNAUTHORIZED]).toBe(401);
  });

  it("maps NOT_FOUND to 404", () => {
    expect(ErrorStatusMap[ErrorCodes.NOT_FOUND]).toBe(404);
  });

  it("maps RATE_LIMITED to 429", () => {
    expect(ErrorStatusMap[ErrorCodes.RATE_LIMITED]).toBe(429);
  });

  it("maps INTERNAL_SERVER_ERROR to 500", () => {
    expect(ErrorStatusMap[ErrorCodes.INTERNAL_SERVER_ERROR]).toBe(500);
  });
});

describe("toAppError", () => {
  it("returns AppError unchanged when already an AppError", () => {
    const original = new AppError(ErrorCodes.CONFLICT, "dup", 409);
    const result = toAppError(original);
    expect(result).toBe(original);
  });

  it("wraps a plain Error into AppError with INTERNAL_SERVER_ERROR", () => {
    const err = new Error("something went wrong");
    const result = toAppError(err);
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe("something went wrong");
    expect(result.status).toBe(500);
    expect(result.details).toEqual({ originalError: "Error" });
  });

  it("wraps unknown input into AppError with generic message", () => {
    const result = toAppError("string error");
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe("An unexpected error occurred");
    expect(result.status).toBe(500);
  });

  it("handles undefined input", () => {
    const result = toAppError(undefined);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe("An unexpected error occurred");
  });

  it("handles null input", () => {
    const result = toAppError(null);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe("An unexpected error occurred");
  });
});
