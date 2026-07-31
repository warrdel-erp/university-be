import { Router } from 'express';
import { z } from 'zod';
import { addExamType, getAllExamType, getSingleExamType, updateExamType, deleteExamType } from "../controllers/examTypeController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";
import { ASSESSMENT_CATEGORIES } from "../constant.js";

const router = Router();

export const addExamTypeBodySchema = z.object({
  academicYearId: z.number().int().positive().optional(),
  instituteId: z.number().int().positive().optional(),
  universityId: z.number().int().positive().optional(),
  examName: z.string().min(1).max(100),
  assessmentCode: z.string().min(1).max(30),
  assessmentCategory: z.string().min(1).max(100),
  assessmentSubCategory: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  averagePassingMark: z.number().optional().nullable(),
  isAveragePassingMark: z.boolean().optional().nullable(),
});

export const updateExamTypeBodySchema = z.object({
  examTypeId: z.coerce.number().int().positive(),
  
  academicYearId: z.number().int().positive().optional(),
  instituteId: z.number().int().positive().optional(),
  universityId: z.number().int().positive().optional(),

  examName: z.string().min(1).max(100).optional(),
  assessmentCode: z.string().min(1).max(30).optional(),
  assessmentCategory: z.string().min(1).max(100).optional(),
  assessmentSubCategory: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  averagePassingMark: z.number().optional().nullable(),
  isAveragePassingMark: z.boolean().optional().nullable(),
});

router.post('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES_ADD.value, null), validate({ body: addExamTypeBodySchema }), addExamType);

router.get('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES.value, null), getAllExamType);

router.get('/single', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES.value, null), getSingleExamType);

router.patch('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES_EDIT.value, null), validate({ body: updateExamTypeBodySchema }), updateExamType);
router.put('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES_EDIT.value, null), validate({ body: updateExamTypeBodySchema }), updateExamType);

router.delete('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES_DELETE.value, null), deleteExamType);

export default router;