import express from 'express';
import useAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { z } from 'zod';
import * as controller from '../controllers/previousAcademicController.js';

const router = express.Router();

const getBatchesQuerySchema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  sessionId: z.coerce.number().int().positive().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

const getSingleBatchParamsSchema = z.object({
  curriculumBatchMappingId: z.coerce.number().int().positive('curriculumBatchMappingId must be a positive integer'),
});

const getSingleBatchQuerySchema = z.object({
  sessionId: z.coerce.number().int().positive().optional(),
});

router.get(
  '/batches',
  useAuth,
  validate({ query: getBatchesQuerySchema }),
  controller.getPreviousAcademicBatches,
);

router.get(
  '/batches/:curriculumBatchMappingId',
  useAuth,
  validate({
    params: getSingleBatchParamsSchema,
    query: getSingleBatchQuerySchema,
  }),
  controller.getSingleBatchDetails,
);

export default router;
