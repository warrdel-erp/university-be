import express from 'express';
import useAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { z } from 'zod';
import { CURRICULUM_PUBLISH_STATUSES } from '../constant.js';
import * as controller from '../controllers/curriculumController.js';
import * as batchController from '../controllers/batchController.js';

const router = express.Router();

const positiveId = z.coerce.number().int().positive();

const createSchema = z.object({
  name: z.string().min(1).max(255),
  courseId: z.number().int().positive(),
  description: z.string().optional(),
  publishStatus: z.enum(CURRICULUM_PUBLISH_STATUSES).optional().default('draft'),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: 'At least one of name or isActive is required',
  });

const publishSchema = z.object({
  publishStatus: z.enum(CURRICULUM_PUBLISH_STATUSES),
});

const mapBatchSchema = z
  .object({
    batch: z.number().int().positive().optional(),
    batchId: z.number().int().positive().optional(),
  })
  .refine((data) => data.batch !== undefined || data.batchId !== undefined, {
    message: 'Either batch or batchId is required',
  });

const mapSubjectsSchema = z.object({
  subjects: z
    .array(
      z.object({
        subjectId: z.number().int().positive(),
        term: z.number().int().positive(),
        credit: z.number().nonnegative().nullable().optional(),
      }),
    )
    .min(1),
});

const updateSubjectTermMappingSchema = z.object({
  credit: z.number().nonnegative().nullable(),
  term: z.number().int().positive().optional(),
});

const idParamSchema = z.object({
  id: positiveId,
});

const curriculumIdParamSchema = z.object({
  curriculumId: positiveId,
});

const subjectMappingParamSchema = z.object({
  curriculumSubjectTermMappingId: positiveId,
});

const batchMappingParamSchema = z.object({
  curriculumBatchMappingId: positiveId,
});

router.get('/batches', useAuth, batchController.getBatches);
router.get('/', useAuth, controller.getAll);

router.get(
  '/:id/available-subjects',
  useAuth,
  validate({ params: idParamSchema }),
  controller.getAvailableSubjects,
);
router.get(
  '/:id/batches',
  useAuth,
  validate({ params: idParamSchema }),
  controller.getBatches,
);
router.get(
  '/:id',
  useAuth,
  validate({ params: idParamSchema }),
  controller.getById,
);

router.post('/', useAuth, validate(createSchema), controller.create);
router.patch(
  '/:id',
  useAuth,
  validate({ params: idParamSchema, body: updateSchema }),
  controller.update,
);
router.patch(
  '/:id/publish',
  useAuth,
  validate({ params: idParamSchema, body: publishSchema }),
  controller.publish,
);
router.delete(
  '/:id',
  useAuth,
  validate({ params: idParamSchema }),
  controller.remove,
);

router.post(
  '/:curriculumId/map-batch',
  useAuth,
  validate({ params: curriculumIdParamSchema, body: mapBatchSchema }),
  controller.mapBatch,
);
router.post(
  '/:curriculumId/map-subjects',
  useAuth,
  validate({ params: curriculumIdParamSchema, body: mapSubjectsSchema }),
  controller.mapSubjects,
);

router.patch(
  '/addCredit/:curriculumSubjectTermMappingId',
  useAuth,
  validate({
    params: subjectMappingParamSchema,
    body: updateSubjectTermMappingSchema,
  }),
  controller.updateSubjectTermMapping,
);

router.delete(
  '/subject-mappings/:curriculumSubjectTermMappingId',
  useAuth,
  validate({ params: subjectMappingParamSchema }),
  controller.unmapSubject,
);
router.delete(
  '/batch-mappings/:curriculumBatchMappingId',
  useAuth,
  validate({ params: batchMappingParamSchema }),
  controller.unmapBatch,
);

export default router;
