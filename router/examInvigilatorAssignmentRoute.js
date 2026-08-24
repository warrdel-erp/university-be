import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
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

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const positiveIntegerId = z.union([
  z.string().regex(/^\d+$/).transform(Number),
  z.number().int().positive(),
]);

const positiveIntegerQueryId = z.preprocess(
  emptyToUndefined,
  z
    .union([
      z.string().regex(/^\d+$/).transform(Number),
      z.number().int().positive(),
    ])
    .optional(),
);

const createSchema = {
  body: z.object({
    examinationSessionSlotId: positiveIntegerId,
    examDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD"),
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
    examDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD")
      .optional(),
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
    page: z.preprocess(
      emptyToUndefined,
      z
        .union([
          z.string().regex(/^\d+$/).transform(Number),
          z.number().int().positive(),
        ])
        .optional()
        .default(1),
    ),
    limit: z.preprocess(
      emptyToUndefined,
      z
        .union([
          z.string().regex(/^\d+$/).transform(Number),
          z.number().int().positive(),
        ])
        .optional()
        .default(10),
    ),
  }),
};

const byUserIdSchema = {
  query: z.object({
    userId: positiveIntegerId,
    examinationSessionId: positiveIntegerQueryId,
  }),
};

const byRoomSchema = {
  query: z.object({
    classRoomSectionId: positiveIntegerId,
    examinationSessionId: positiveIntegerQueryId,
    examDate: z.preprocess(emptyToUndefined, z.string().optional()),
    examinationSessionSlotId: positiveIntegerQueryId,
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

router.get("/my", userAuth, getMyAssignments);

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
    examDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD")
      .optional(),
  }),
};

router.get(
  "/availability",
  userAuth,
  validate(availabilitySchema),
  getFacultyAvailability,
);

export default router;
