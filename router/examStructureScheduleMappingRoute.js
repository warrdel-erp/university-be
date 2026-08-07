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

const router = Router();

const positiveIntegerQueryId = z.preprocess(
  (val) => (val === "" || val === undefined ? undefined : val),
  z.coerce.number().int().positive()
);

const addScheduleSchema = {
  body: z.object({
    subjectId: z.coerce.number().int().positive().optional().nullable(),
    term: z.coerce.number().int().positive().optional().nullable(),
    examSetupTypeId: z.coerce.number().int().positive().optional().nullable(),
    academicYearId: z.coerce.number().int().positive().optional().nullable(),
    sessionId: z.coerce.number().int().positive().optional().nullable(),
    examinationSessionSlotId: z.coerce.number().int().positive().optional().nullable(),
    examDate: z.string().min(1, "examDate is required"),
    examTime: z.string().optional().nullable(),
    type: z.string().min(1, "type is required"),
    duration: z.string().optional().nullable(),
  }),
};

const updateScheduleSchema = {
  body: z.object({
    examScheduleId: z.coerce.number().int().positive({ message: "examScheduleId is required" }),
    subjectId: z.coerce.number().int().positive().optional().nullable(),
    term: z.coerce.number().int().positive().optional().nullable(),
    examSetupTypeId: z.coerce.number().int().positive().optional().nullable(),
    examSetupTypeTermId: z.coerce.number().int().positive().optional().nullable(),
    academicYearId: z.coerce.number().int().positive().optional().nullable(),
    sessionId: z.coerce.number().int().positive().optional(),
    examinationSessionSlotId: z.coerce.number().int().positive().optional().nullable(),
    examDate: z.string().optional(),
    examTime: z.string().optional().nullable(),
    type: z.string().optional(),
    duration: z.string().optional().nullable(),
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
