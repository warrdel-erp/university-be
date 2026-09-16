import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  emptyToUndefined,
  positiveIntegerId,
  optionalQueryId as positiveIntegerQueryId,
  dateStringSchema,
  selectionsSchema,
} from "../utility/examZodSchemas.js";

import {
  createAssignment,
  updateAssignment,
  getAssignmentById,
  getAssignments,
  deleteAssignment,
  getListOfRoomsRoomWise,
  getInvigilatorSummary,
  getAssignmentsByUserId,
  getAssignmentsByRoom,
  getFacultyAvailability,
  getMyAssignments,
} from "../controllers/examInvigilatorAssignmentController.js";

const router = Router();

const createSchema = {
  body: z.object({
    examinationSessionSlotId: positiveIntegerId,
    examDate: dateStringSchema,
    classRoomSectionId: positiveIntegerId,
    userId: positiveIntegerId,
    role: z.string().min(1, "role is required"),
  }),
};

const updateSchema = {
  query: z.object({
    examInvigilatorAssignmentId: positiveIntegerId,
  }),
  body: z.object({
    userId: positiveIntegerId.optional(),
    examinationSessionSlotId: positiveIntegerId.optional(),
    examDate: dateStringSchema.optional(),
    classRoomSectionId: positiveIntegerId.optional(),
    role: z.string().optional(),
  }),
};

const getByIdSchema = {
  query: z.object({
    examInvigilatorAssignmentId: positiveIntegerId,
  }),
};

const getListSchema = {
  query: z.object({
    examInvigilatorAssignmentId: positiveIntegerQueryId,
    examinationSessionSlotId: positiveIntegerQueryId,
    examDate: z.preprocess(emptyToUndefined, z.string().optional()),
    classRoomSectionId: positiveIntegerQueryId,
    userId: positiveIntegerQueryId,
    role: z.preprocess(emptyToUndefined, z.string().optional()),
    examScheduleId: positiveIntegerQueryId,
  }),
};


// Room-centric schema: unique rooms carrying their exam list
const getRoomsRoomWiseSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerId,
    examDate: z.preprocess(emptyToUndefined, z.string().optional()),
    page: positiveIntegerQueryId.default(1),
    limit: positiveIntegerQueryId.default(10),
    selections: selectionsSchema,
  }),
};

const byUserIdSchema = {
  query: z.object({
    userId: positiveIntegerId,
    examinationSessionId: positiveIntegerQueryId,
  }),
};

const myAssignmentsSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
  }),
};

const byRoomSchema = {
  query: z.object({
    classRoomSectionId: positiveIntegerId,
    examinationSessionId: positiveIntegerId,
    examDate: dateStringSchema,
    examinationSessionSlotId: positiveIntegerId,
  }),
};

const getInvigilatorSummarySchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
    courseId: positiveIntegerId,
    sessionId: positiveIntegerId,
    term: positiveIntegerId,
    examDate: z.preprocess(emptyToUndefined, z.string().optional()),
    examinationSessionSlotId: positiveIntegerQueryId,
  }),
};

router.post("/", userAuth, validate(createSchema), createAssignment);

router.patch("/", userAuth, validate(updateSchema), updateAssignment);
router.get(
  "/summary",
  userAuth,
  validate(getInvigilatorSummarySchema),
  getInvigilatorSummary,
);
router.get("/rooms", userAuth, validate(getRoomsRoomWiseSchema), getListOfRoomsRoomWise);


router.get("/", userAuth, validate(getListSchema), getAssignments);
router.delete("/", userAuth, validate(getByIdSchema), deleteAssignment);
router.get(
  "/byUserId",
  userAuth,
  validate(byUserIdSchema),
  getAssignmentsByUserId,
);

router.get("/my", userAuth,validate(myAssignmentsSchema), getMyAssignments);

router.get(
  "/byroom",
  userAuth,
  validate(byRoomSchema),
  getAssignmentsByRoom,
);

const availabilitySchema = {
  query: z.object({
    examScheduleId: positiveIntegerQueryId,
    classRoomSectionId: positiveIntegerQueryId,
    examinationSessionSlotId: positiveIntegerQueryId,
    examDate: dateStringSchema.optional(),
  }),
};

router.get(
  "/availability",
  userAuth,
  validate(availabilitySchema),
  getFacultyAvailability,
);

export default router;
