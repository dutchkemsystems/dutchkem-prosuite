/**
 * Input validation helpers for Convex functions.
 *
 * Uses Convex's built-in `v` validators — no external dependencies.
 * Edge-runtime safe.
 *
 * Usage:
 *   import { assertNonEmpty, assertPositive, assertValidPlatform } from "../lib/validation";
 *   assertNonEmpty(args.content, "content");
 */

import { AppError, ErrorCodes } from "./errors";

export function assertNonEmpty(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `${fieldName} must be a non-empty string`, 400);
  }
}

export function assertPositive(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== "number" || value <= 0 || !Number.isFinite(value)) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `${fieldName} must be a positive number`, 400);
  }
}

export function assertValidEmail(value: unknown, fieldName: string): asserts value is string {
  assertNonEmpty(value, fieldName);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value as string)) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `${fieldName} must be a valid email address`, 400);
  }
}

export function assertValidUrl(value: unknown, fieldName: string): asserts value is string {
  assertNonEmpty(value, fieldName);
  try {
    new URL(value as string);
  } catch {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `${fieldName} must be a valid URL`, 400);
  }
}

export function assertValidPlatform(value: string, supportedPlatforms: readonly string[]): asserts value is string {
  if (!supportedPlatforms.includes(value)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `Unsupported platform: ${value}. Supported: ${supportedPlatforms.join(", ")}`,
      400
    );
  }
}

export function assertArrayMinLength<T>(value: T[], fieldName: string, min: number): asserts value is T[] {
  if (!Array.isArray(value) || value.length < min) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `${fieldName} must have at least ${min} items`, 400);
  }
}

export function assertEnum<T extends readonly string[]>(
  value: unknown,
  fieldName: string,
  allowed: T
): asserts value is T[number] {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `${fieldName} must be one of: ${allowed.join(", ")}`,
      400
    );
  }
}
