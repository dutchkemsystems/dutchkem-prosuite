import { v, type Infer, type Validator } from "convex/values";
import type { FlexibleSchema } from "@ai-sdk/provider-utils";

export function convexSchema<T extends Validator<any, any, any>>(validator: T): FlexibleSchema<Infer<T>> {
  return validator as unknown as FlexibleSchema<Infer<T>>;
}
