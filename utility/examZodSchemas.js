import { z } from "zod";

/**
 * Preprocessor: converts empty strings, null, undefined → undefined.
 * Use in z.preprocess() to handle empty query-string values.
 */
export const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

/**
 * Required positive integer — accepts a digit string (→ Number) or a number.
 * Use for body / params fields that must be present.
 */
export const positiveIntegerId = z.union([
  z.string().regex(/^\d+$/).transform(Number),
  z.number().int().positive(),
]);

/**
 * Required positive integer for query params.
 * Handles empty-string → undefined (then Zod rejects as required).
 */
export const positiveIntegerQueryId = z.preprocess(
  emptyToUndefined,
  positiveIntegerId,
);

/**
 * Optional positive integer for query params.
 * Handles empty-string → undefined (accepted as "absent").
 */
export const optionalQueryId = z.preprocess(
  emptyToUndefined,
  positiveIntegerId.optional(),
);

/**
 * Date string in YYYY-MM-DD format.
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/**
 * JSON-encoded selections array: [{ courseSessionMappingId, terms }].
 * Accepts a JSON string from query params and parses it.
 */
export const selectionsSchema = z.preprocess(
  (val) => {
    if (!val || val === "") return undefined;
    try {
      return typeof val === "string" ? JSON.parse(val) : val;
    } catch {
      return undefined;
    }
  },
  z
    .array(
      z.object({
        courseSessionMappingId: z.number().int().positive(),
        terms: z.array(z.number().int().positive()),
      }),
    )
    .optional(),
);
