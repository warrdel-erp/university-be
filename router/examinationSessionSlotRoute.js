import express from 'express';
import { z } from 'zod';
import * as examinationSessionSlotController from '../controllers/examinationSessionSlotController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import {
  dateStringSchema,
  positiveIntegerQueryId,
  selectionsSchema,
} from '../utility/examZodSchemas.js';

const router = express.Router();

const createSlotSchema = {
  body: z.object({
    examinationSessionId: z.coerce.number().int().positive(),
    numberOfSlots: z.coerce.number().int().positive().optional(),
    slotNumber: z.coerce.number().int().positive().optional().nullable(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  }),
};

const getSlotsSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
    date: dateStringSchema.optional(),
    selections: selectionsSchema,
    filterStatus: z.enum(["all", "needsScheduling", "roomPending", "ready", "published"]).default("all"),
  }),
};

const getSlotByIdSchema = {
  query: z.object({
    examinationSessionSlotId: positiveIntegerQueryId,
  }),
};

const getSingleSlotSchema = {
  query: z
    .object({
      examinationSessionId: positiveIntegerQueryId.optional(),
      examinationSessionSlotId: positiveIntegerQueryId.optional(),
    })
    .refine(
      (data) =>
        data.examinationSessionId != null ||
        data.examinationSessionSlotId != null,
      {
        message:
          "examinationSessionId or examinationSessionSlotId is required",
      },
    ),
};

const updateSlotSchema = {
  body: z.array(
    z.object({
      examinationSessionSlotId: z.coerce.number().int().positive(),
      slotNumber: z.coerce.number().int().positive().optional(),
      startTime: z.string().optional().nullable(),
      endTime: z.string().optional().nullable(),
      durationMinutes: z.coerce.number().int().positive().optional().nullable(),
    })
  ).min(1, "At least one slot update is required"),
};

router.post('/', userAuth, validate(createSlotSchema), examinationSessionSlotController.createExaminationSessionSlot);
router.get('/count', userAuth, validate(getSlotsSchema), examinationSessionSlotController.getExaminationSessionSlotsCount);
router.get('/', userAuth, validate(getSlotsSchema), examinationSessionSlotController.getExaminationSessionSlots);
router.get('/single', userAuth, validate(getSingleSlotSchema), examinationSessionSlotController.getExaminationSessionSlotById);
router.patch('/', userAuth, validate(updateSlotSchema), examinationSessionSlotController.updateExaminationSessionSlot);
router.delete('/', userAuth, validate(getSlotByIdSchema), examinationSessionSlotController.deleteExaminationSessionSlot);

export default router;
