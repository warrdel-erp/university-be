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

const createSlotSchema = {
  body: z.object({
    examinationSessionId: z.coerce.number().int().positive(),
    numberOfSlots: z.coerce.number().int().positive().optional(),
    slotNumber: z.coerce.number().int().positive().optional().nullable(),
    slotName: z.string().max(100).optional().nullable(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  }),
};

const getSlotsSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
  }),
};

const getSlotByIdSchema = {
  query: z.object({
    examinationSessionSlotId: positiveIntegerQueryId,
  }),
};

const updateSlotSchema = {
  query: z.object({
    examinationSessionSlotId: positiveIntegerQueryId,
  }),
  body: z.object({
    slotNumber: z.coerce.number().int().positive().optional(),
    slotName: z.string().max(100).optional().nullable(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  }),
};

router.post('/', userAuth, validate(createSlotSchema), examinationSessionSlotController.createExaminationSessionSlot);
router.get('/', userAuth, validate(getSlotsSchema), examinationSessionSlotController.getExaminationSessionSlots);
router.get('/single', userAuth, validate(getSlotByIdSchema), examinationSessionSlotController.getExaminationSessionSlotById);
router.patch('/', userAuth, validate(updateSlotSchema), examinationSessionSlotController.updateExaminationSessionSlot);
router.delete('/', userAuth, validate(getSlotByIdSchema), examinationSessionSlotController.deleteExaminationSessionSlot);

export default router;
