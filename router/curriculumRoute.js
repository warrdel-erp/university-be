import express from 'express';
import useAuth from '../middleware/authUser.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { validate } from '../utility/validation.js';
import { PERMISSIONS } from '../const/permissions.js';
import { z } from 'zod';
import * as controller from '../controllers/curriculumController.js';
import * as batchController from '../controllers/batchController.js';

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1).max(255),
  courseId: z.number().int().positive(),
  description: z.string().optional(),
});

const mapBatchSchema = z.object({
    batch: z.number().int().positive().optional(),
    batchId: z.number().int().positive().optional(),
}).refine(data => data.batch !== undefined || data.batchId !== undefined, {
    message: "Either batch or batchId is required"
});

const mapSubjectsSchema = z.object({
    subjects: z.array(z.object({
        subjectId: z.number().int().positive(),
        term: z.number().int().positive(),
        credit: z.number().nonnegative().nullable().optional(),
    })).min(1),
});

const updateSubjectTermMappingSchema = z.object({
  credit: z.number().nonnegative().nullable(),
  term: z.number().int().positive().optional(),
});

router.get('/batches', useAuth, batchController.getBatches);
router.get('/', useAuth, controller.getAll);
router.get('/:id/available-subjects', useAuth, controller.getAvailableSubjects);
router.get('/:id', useAuth, controller.getById);
router.post('/', useAuth, validate(createSchema), controller.create);
router.post('/:curriculumId/map-batch', useAuth, validate(mapBatchSchema), controller.mapBatch);
router.post('/:curriculumId/map-subjects', useAuth, validate(mapSubjectsSchema), controller.mapSubjects);
router.patch(
  '/addCredit/:curriculumSubjectTermMappingId',
  useAuth,
  validate({
    params: z.object({
      curriculumSubjectTermMappingId: z.coerce.number().int().positive(),
    }),
    body: updateSubjectTermMappingSchema,
  }),
  controller.updateSubjectTermMapping,
);

export default router;
