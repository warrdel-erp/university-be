import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import * as examOperationsController from "../controllers/examOperationsController.js";
import {
  emptyToUndefined,
  dateStringSchema,
  selectionsSchema,
} from "../utility/examZodSchemas.js";

const router = Router();

const id = z.coerce.number().int().positive();

const roomsQuery = z.object({
  examinationSessionId: id,
  examDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
  selections: selectionsSchema,
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
