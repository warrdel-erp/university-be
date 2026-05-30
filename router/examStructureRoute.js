import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
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

const getSingleExamStructureQuerySchema = z.object({
  courseId: z.coerce.number().int().positive(),
  sessionId: z.coerce.number().int().positive(),
});

const getDetailByExamTypeQuerySchema = z.object({
  examSetupTypeId: z.coerce.number().int().positive(),
});

const getSingleExamTypeQuerySchema = z.object({
  courseId: z.coerce.number().int().positive(),
  sessionId: z.coerce.number().int().positive(),
  termNumber: z.coerce.number().int().positive().optional(),
});

router.post("/examRule", userAuth, addExamStructure);

router.get("/examRule", userAuth, getAllExamStructure);

router.get(
  "/examRule/single",
  userAuth,
  validate({ query: getSingleExamStructureQuerySchema }),
  getSingleExamStructure,
);
x;

router.patch("/examRule", userAuth, updateExamStructure);

router.delete("/examRule", userAuth, deleteExamStructure);

router.post("/examType", userAuth, addExamType);

router.get("/examType", userAuth, validate({ query: getDetailByExamTypeQuerySchema }), getDetailByExamType);

router.get("/examType/single", userAuth, validate({ query: getSingleExamTypeQuerySchema }), getSingleExamType);

router.patch("/examType", userAuth, updateExamType);

router.delete("/examType/:examSetupTypeId", userAuth, deleteExamType);

export default router;
