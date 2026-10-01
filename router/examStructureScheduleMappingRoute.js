import { Router } from "express";
import { z } from "zod";
import {
    addExamStructureSchedule,
    getAllExamStructureSchedule,
    publishExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    addExamSchedule,
    getDetailByExamType,
    getExamDetailByStudentId,
    getExamScheduleById
} from "../controllers/examStructureScheduleMappingController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";
import { positiveIntegerQueryId } from "../utility/examZodSchemas.js";

const router = Router();

const addScheduleSchema = {
  body: z.object({
    subjectId: z.coerce.number().int().positive("subjectId is required"),
    batchId: z.coerce.number().int().positive("batchId is required"),
    curriculumSubjectTermMappingId: z.coerce
      .number()
      .int()
      .positive("curriculumSubjectTermMappingId is required"),
    term: z.coerce.number().int().positive("term is required"),
    examinationSessionId: z.coerce
      .number()
      .int()
      .positive("examinationSessionId is required"),
    examinationSessionSlotId: z.coerce
      .number()
      .int()
      .positive("examinationSessionSlotId is required"),
    examDate: z.string().min(1, "examDate is required"),
    type: z.string().min(1, "type is required"),
    examTime: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
    maximumMarks: z.coerce.number().optional().nullable(),
  }),
};

const updateScheduleSchema = {
  body: z.object({
    examScheduleId: z.coerce
      .number()
      .int()
      .positive({ message: "examScheduleId is required" }),
    subjectId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional().nullable(),
    curriculumSubjectTermMappingId: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),
    term: z.coerce.number().int().positive().optional().nullable(),
    examinationSessionSlotId: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),
    examinationSessionId: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),
    examDate: z.string().optional(),
    examTime: z.string().optional().nullable(),
    type: z.string().optional(),
    duration: z.string().optional().nullable(),
    maximumMarks: z.coerce.number().optional().nullable(),
  }),
};

const deleteScheduleSchema = {
  query: z.object({
    examScheduleId: positiveIntegerQueryId,
  }),
};

const addExamStructureScheduleSchema = {
  body: z.object({
    examSetupTypeId: z.coerce.number().int().positive({ message: "examSetupTypeId is required" }),
    sessionId: z.coerce.number().int().positive({ message: "sessionId is required" }),
    academicYearId: z.coerce.number().int().positive().optional().nullable(),
    name: z.string().min(1, "name is required"),
    startingDate: z.string().optional().nullable(),
  }),
};

router.post("/", userAuth, validate(addExamStructureScheduleSchema), addExamStructureSchedule);

router.patch("/publish", userAuth, publishExamSchedule);

router.get("/getScheduleById/:id", userAuth, getExamScheduleById);

router.get("/", userAuth, getAllExamStructureSchedule);

router.post("/schedule", userAuth, checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ADD.value, null), validate(addScheduleSchema), addExamSchedule);
router.patch("/schedule", userAuth, checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ADD.value, null), validate(updateScheduleSchema), updateExamSchedule);
router.delete("/schedule", userAuth, checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ADD.value, null), validate(deleteScheduleSchema), deleteExamSchedule);

router.get("/student", userAuth, getExamDetailByStudentId);
router.get("/examType", userAuth, getDetailByExamType);

export default router;
