import { Router } from "express";
import { z } from "zod";
import {
    addInternalAssessment,
    getAllInternalAssessment,
    getSingleInternalAssessment,
    updateInternalAssessments,
    deleteInternalAssessment,
    evaluationInternalAssessment,
    createAssessmentEvaluation,
    updateAssessmentEvaluation,
} from "../controllers/internalAssessmentController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const addInternalAssessmentSchema = z.object({
    subjectId: positiveIntegerId,
    term: positiveIntegerId,
    examSetupTypeId: positiveIntegerId,
    type: z.string().min(1),
    totalMarks: positiveIntegerId,
    weightage: z.coerce.number().int().min(0).optional(),
    publishDate: z.string().min(1),
    dueDate: z.string().min(1),
    description: z.string().min(1),
    employeeId: positiveIntegerId.optional(),
}).strict();

const getAllInternalAssessmentQuerySchema = z.object({
    examSetupTypeId: positiveIntegerId.optional(),
}).strict();

const examAssessmentIdQuerySchema = z.object({
    examAssessmentId: positiveIntegerId,
}).strict();

const updateInternalAssessmentSchema = z.array(z.object({
    examAssessmentId: positiveIntegerId,
    subjectId: positiveIntegerId.optional(),
    term: positiveIntegerId.optional(),
    examSetupTypeId: positiveIntegerId.optional(),
    type: z.string().min(1).optional(),
    totalMarks: positiveIntegerId.optional(),
    weightage: z.coerce.number().int().min(0).optional(),
    publishDate: z.string().min(1).optional(),
    dueDate: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    employeeId: positiveIntegerId.optional(),
}).strict()).min(1, 'Request body must be a non-empty array.');

const evaluationQuerySchema = z.object({
    subjectId: positiveIntegerId,
    employeeId: positiveIntegerId,
}).strict();

const assessmentEvaluationStudentSchema = z.object({
    studentId: positiveIntegerId,
    status: z.string().min(1).optional(),
    marks: z.coerce.number().int().min(0),
    comments: z.string().optional(),
    file: z.any().optional(),
}).strict();

const createAssessmentEvaluationSchema = z.object({
    subjectId: positiveIntegerId,
    employeeId: positiveIntegerId,
    examAssessmentId: positiveIntegerId,
    students: z.array(assessmentEvaluationStudentSchema).min(1, 'students array is required'),
}).strict();

const updateAssessmentEvaluationSchema = z.object({
    assessmentEvalutionId: positiveIntegerId,
    subjectId: positiveIntegerId.optional(),
    employeeId: positiveIntegerId.optional(),
    examAssessmentId: positiveIntegerId.optional(),
    studentId: positiveIntegerId.optional(),
    status: z.string().min(1).optional(),
    marks: z.coerce.number().int().min(0).optional(),
    comments: z.string().optional(),
    file: z.any().optional(),
}).strict();

router.post("/", userAuth, checkAccess(PERMISSIONS.INTERNAL_ASSESSMENT_ADD.value, null), validate({ body: addInternalAssessmentSchema }), addInternalAssessment);

router.get("/", userAuth, checkAccess(PERMISSIONS.INTERNAL_ASSESSMENT.value, null), validate({ query: getAllInternalAssessmentQuerySchema }), getAllInternalAssessment);

router.get("/single", userAuth, checkAccess(PERMISSIONS.INTERNAL_ASSESSMENT.value, null), validate({ query: examAssessmentIdQuerySchema }), getSingleInternalAssessment);

router.patch("/", userAuth, checkAccess(PERMISSIONS.INTERNAL_ASSESSMENT_EDIT.value, null), validate({ body: updateInternalAssessmentSchema }), updateInternalAssessments);

router.delete("/", userAuth, checkAccess(PERMISSIONS.INTERNAL_ASSESSMENT_DELETE.value, null), validate({ query: examAssessmentIdQuerySchema }), deleteInternalAssessment);

router.get("/evaluation", userAuth, checkAccess(PERMISSIONS.INTERNAL_ASSESSMENT.value, null), validate({ query: evaluationQuerySchema }), evaluationInternalAssessment);

router.post("/evaluation", userAuth, checkAccess(PERMISSIONS.INTERNAL_ASSESSMENT_EVALUATE.value, null), validate({ body: createAssessmentEvaluationSchema }), createAssessmentEvaluation);

router.patch("/evaluation", userAuth, checkAccess(PERMISSIONS.INTERNAL_ASSESSMENT_EVALUATE.value, null), validate({ body: updateAssessmentEvaluationSchema }), updateAssessmentEvaluation);

export default router;