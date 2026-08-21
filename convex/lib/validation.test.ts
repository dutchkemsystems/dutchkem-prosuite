import { describe, it, expect } from "vitest";
import {
  assertNonEmpty,
  assertPositive,
  assertValidEmail,
  assertValidUrl,
  assertEnum,
  assertArrayMinLength,
} from "./validation";
import { AppError } from "./errors";

function throwsAppError(fn: () => void): AppError {
  try {
    fn();
    throw new Error("Expected AppError to be thrown");
  } catch (e) {
    if (e instanceof AppError) return e;
    throw e;
  }
}

describe("assertNonEmpty", () => {
  it("passes for a valid non-empty string", () => {
    expect(() => assertNonEmpty("hello", "field")).not.toThrow();
  });

  it("passes for a string with leading/trailing spaces", () => {
    expect(() => assertNonEmpty("  hello  ", "field")).not.toThrow();
  });

  it("throws AppError for empty string", () => {
    const err = throwsAppError(() => assertNonEmpty("", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toContain("field must be a non-empty string");
  });

  it("throws AppError for whitespace-only string", () => {
    const err = throwsAppError(() => assertNonEmpty("   ", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for null", () => {
    const err = throwsAppError(() => assertNonEmpty(null, "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for undefined", () => {
    const err = throwsAppError(() => assertNonEmpty(undefined, "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for a number", () => {
    const err = throwsAppError(() => assertNonEmpty(123, "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("assertPositive", () => {
  it("passes for positive numbers", () => {
    expect(() => assertPositive(1, "field")).not.toThrow();
    expect(() => assertPositive(0.5, "field")).not.toThrow();
    expect(() => assertPositive(999, "field")).not.toThrow();
  });

  it("throws AppError for 0", () => {
    const err = throwsAppError(() => assertPositive(0, "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toContain("field must be a positive number");
  });

  it("throws AppError for negative numbers", () => {
    const err = throwsAppError(() => assertPositive(-5, "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for NaN", () => {
    const err = throwsAppError(() => assertPositive(NaN, "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for Infinity", () => {
    const err = throwsAppError(() => assertPositive(Infinity, "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for a string", () => {
    const err = throwsAppError(() => assertPositive("5" as unknown as number, "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("assertValidEmail", () => {
  it("passes for valid email addresses", () => {
    expect(() => assertValidEmail("user@example.com", "field")).not.toThrow();
    expect(() => assertValidEmail("test.name@domain.co.uk", "field")).not.toThrow();
    expect(() => assertValidEmail("a+b@c.com", "field")).not.toThrow();
  });

  it("throws AppError for invalid emails", () => {
    const err = throwsAppError(() => assertValidEmail("notanemail", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toContain("valid email");
  });

  it("throws AppError for email without @", () => {
    const err = throwsAppError(() => assertValidEmail("userexample.com", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for email without domain", () => {
    const err = throwsAppError(() => assertValidEmail("user@", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for empty string", () => {
    const err = throwsAppError(() => assertValidEmail("", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("assertValidUrl", () => {
  it("passes for valid URLs", () => {
    expect(() => assertValidUrl("https://example.com", "field")).not.toThrow();
    expect(() => assertValidUrl("http://localhost:3000", "field")).not.toThrow();
    expect(() => assertValidUrl("ftp://files.example.com/doc.pdf", "field")).not.toThrow();
  });

  it("throws AppError for invalid URLs", () => {
    const err = throwsAppError(() => assertValidUrl("not-a-url", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toContain("valid URL");
  });

  it("throws AppError for empty string", () => {
    const err = throwsAppError(() => assertValidUrl("", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("throws AppError for string without protocol", () => {
    const err = throwsAppError(() => assertValidUrl("example.com", "field"));
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("assertEnum", () => {
  const allowed = ["apple", "banana", "cherry"] as const;

  it("passes for valid enum values", () => {
    expect(() => assertEnum("apple", "fruit", allowed)).not.toThrow();
    expect(() => assertEnum("cherry", "fruit", allowed)).not.toThrow();
  });

  it("throws AppError for invalid enum value", () => {
    const err = throwsAppError(() => assertEnum("grape", "fruit", allowed));
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toContain("apple, banana, cherry");
  });

  it("throws AppError for non-string value", () => {
    const err = throwsAppError(() => assertEnum(123 as unknown as string, "fruit", allowed));
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("assertArrayMinLength", () => {
  it("passes when array meets minimum length", () => {
    expect(() => assertArrayMinLength([1, 2, 3], "items", 3)).not.toThrow();
    expect(() => assertArrayMinLength([1, 2, 3, 4], "items", 3)).not.toThrow();
  });

  it("passes for empty array when min is 0", () => {
    expect(() => assertArrayMinLength([], "items", 0)).not.toThrow();
  });

  it("throws AppError when array is too short", () => {
    const err = throwsAppError(() => assertArrayMinLength([1], "items", 3));
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toContain("at least 3 items");
  });

  it("throws AppError for non-array input", () => {
    const err = throwsAppError(() => assertArrayMinLength("not-array" as unknown as [], "items", 1));
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});
