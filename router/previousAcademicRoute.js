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

const getTermStudentsParamsSchema = z.object({
  curriculumBatchTermMappingId: z.coerce
    .number()
    .int()
    .positive('curriculumBatchTermMappingId must be a positive integer'),
});

router.get(
  '/batches',
  useAuth,
  validate({ query: getBatchesQuerySchema }),
  controller.getPreviousAcademicBatches,
);

router.get(
  '/terms/:curriculumBatchTermMappingId/students/template',
  useAuth,
  validate({
    params: getTermStudentsParamsSchema,
    query: getSingleBatchQuerySchema,
  }),
  controller.downloadTermMarksTemplate,
);

router.post(
  '/terms/:curriculumBatchTermMappingId/students/upload',
  useAuth,
  validate({
    params: getTermStudentsParamsSchema,
    query: getSingleBatchQuerySchema,
  }),
  controller.uploadTermMarks,
);

router.get(
  '/terms/:curriculumBatchTermMappingId/students',
  useAuth,
  validate({
    params: getTermStudentsParamsSchema,
    query: getSingleBatchQuerySchema,
  }),
  controller.getTermStudents,
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
