import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import {
  addExamStructure,
  getAllExamStructure,
  getSingleExamStructure,
  updateExamStructure,
  deleteExamStructure,
  addExamType,
  getDetailByExamType,
  getSingleExamType,
  updateExamType,
  deleteExamType,
} from "../controllers/examStructureController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const positiveIntegerId = z.coerce.number().int().positive();

const getAllExamStructureQuerySchema = z.object({});

const getSingleExamStructureQuerySchema = z.object({
  courseId: positiveIntegerId,
  sessionId: positiveIntegerId,
});

const getDetailByExamTypeQuerySchema = z.object({
  examSetupTypeId: positiveIntegerId,
});

const getSingleExamTypeQuerySchema = z.object({
  courseId: positiveIntegerId,
  sessionId: positiveIntegerId,
  termNumber: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
});

const addExamTypeSchema = z.object({
  examStructureId: z.coerce
    .number({ required_error: "examStructureId is required" })
    .int()
    .positive(),
  examType: z.string().optional(),
  examName: z.string().optional(),
  maximumAssessment: z.coerce.number().int().optional(),
  isPublish: z.boolean().optional(),
});

router.post("/examRule", userAuth, checkAccess(PERMISSIONS.RULES_SETUP_ADD.value, null), addExamStructure);

router.get(
  "/examRule",
  userAuth,
  checkAccess(PERMISSIONS.RULES_SETUP.value, null),
  validate({ query: getAllExamStructureQuerySchema }),
  getAllExamStructure,
);

router.get(
  "/examRule/single",
  userAuth,
  checkAccess(PERMISSIONS.RULES_SETUP.value, null),
  validate({ query: getSingleExamStructureQuerySchema }),
  getSingleExamStructure,
);

router.patch("/examRule", userAuth, checkAccess(PERMISSIONS.RULES_SETUP_ADD.value, null), updateExamStructure);

router.delete("/examRule", userAuth, checkAccess(PERMISSIONS.RULES_SETUP_ADD.value, null), deleteExamStructure);

router.post("/examType", userAuth, validate({ body: addExamTypeSchema }), addExamType);

router.get("/examType", userAuth, validate({ query: getDetailByExamTypeQuerySchema }), getDetailByExamType);

router.get("/examType/single", userAuth, validate({ query: getSingleExamTypeQuerySchema }), getSingleExamType);

router.patch("/examType", userAuth, updateExamType);

router.delete("/examType/:examSetupTypeId", userAuth, deleteExamType);

export default router;
