import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import * as examOperationsController from "../controllers/examOperationsController.js";

const router = Router();

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const id = z.coerce.number().int().positive();

const roomsQuery = z.object({
  examinationSessionId: id,
  examDate: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD")
      .optional(),
  ),
  selections: z.preprocess((val) => {
    if (!val || val === "") return undefined;
    try {
      return typeof val === "string" ? JSON.parse(val) : val;
    } catch {
      return undefined;
    }
  }, z
    .array(
      z.object({
        courseSessionMappingId: z.number().int().positive(),
        terms: z.array(z.number().int().positive()),
      }),
    )
    .optional()),
  status: z.enum(["READY_FOR_EXAM", "NOT_READY"]).optional(),
  page: id.optional().default(1),
  limit: id.optional().default(10),
});

router.get(
  "/rooms",
  userAuth,
  validate({ query: roomsQuery }),
  examOperationsController.listRooms,
);

export default router;
