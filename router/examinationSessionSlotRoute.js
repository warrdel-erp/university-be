import express from 'express';
import { z } from 'zod';
import * as examinationSessionSlotController from '../controllers/examinationSessionSlotController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = express.Router();

const positiveIntegerQueryId = z.preprocess(
  (val) => (val === "" || val === undefined ? undefined : val),
  z.coerce.number().int().positive()
);

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");



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
    selections: z.preprocess(
      (val) => {
        if (!val || val === "") return undefined;
        try {
          return typeof val === "string" ? JSON.parse(val) : val;
        } catch {
          return undefined;
        }
      },
      z.array(
        z.object({
          courseSessionMappingId: z.number().int().positive(),
          terms: z.array(z.number().int().positive()),
        })
      ).optional()
    ),
    filterStatus: z.enum(["all", "needsScheduling", "roomPending", "ready", "published"]).default("all"),
  }),
};

const getSlotByIdSchema = {
  query: z.object({
    examinationSessionSlotId: positiveIntegerQueryId,
  }),
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
router.get('/', userAuth, validate(getSlotsSchema), examinationSessionSlotController.getExaminationSessionSlots);
router.get('/single', userAuth, validate(getSlotByIdSchema), examinationSessionSlotController.getExaminationSessionSlotById);
router.patch('/', userAuth, validate(updateSlotSchema), examinationSessionSlotController.updateExaminationSessionSlot);
router.delete('/', userAuth, validate(getSlotByIdSchema), examinationSessionSlotController.deleteExaminationSessionSlot);

export default router;
