import { z } from "zod";

/**
 * Common validation middleware using Zod
 * @param {Object|z.ZodSchema} schemas - Object containing schemas for body, query, params, or a single Zod schema for body
 * @returns {Function} Express middleware
 */
export const validate = (schemas) => (req, res, next) => {
  try {
    // If it's a direct Zod schema, assume it's for the body
    if (schemas instanceof z.ZodType) {
      req.body = schemas.parse(req.body);
      return next();
    }

    // Otherwise, validate specified parts
    if (schemas.body) {
      console.log("Validating body with schema:", typeof schemas.body);
      if (schemas.body && typeof schemas.body.parse !== 'function') {
         console.log("schemas.body.parse is not a function!");
      }
      req.body = schemas.body.parse(req.body);
    }

    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }

    next();
  } catch (error) {

    console.log(error)
    if (error instanceof z.ZodError) {
      let issues = [];
      try {
        // Handle cases where Zod returns issues as a JSON string in .message
        // or directly in .issues/.errors
        issues =
          typeof error.message === "string" && error.message.startsWith("[")
            ? JSON.parse(error.message)
            : error.issues || error.errors || [];
      } catch (e) {
        issues = [];
      }

      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: issues.map((err) => ({
          path: Array.isArray(err.path) ? err.path.join(".") : "unknown",
          message: err.message,
        })),
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error during validation",
    });
  }
};
