import { Router } from "express";
import { z } from "zod";
import * as examScheduleController from "../controllers/examScheduleController.js";
import * as examRoomCapacityController from "../controllers/examScheduleRoomCapacityController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const router = Router();

const classRoomSectionIdsSchema = z.object({
  examScheduleId: z.coerce.number(),

  classRoomSectionIds: z
    .array(
      z.object({
        classRoomSectionId: z.coerce.number(),
        orderKey: z.coerce.number().optional(),
      }),
    )
    .transform((items) => items.map((item) => item.classRoomSectionId)),
});

const addExamRoomCapacitySchema = z.object({
  classRoomSectionIds: z
    .array(
      z.union([
        z.number(),
        z.object({
          classRoomSectionId: z.number(),
          orderKey: z.number().int().positive().optional(),
        }),
      ]),
    )
    .min(1, "At least one room is required"),
  examScheduleId: z.number({ required_error: "examScheduleId is required" }),
});

const updateExamRoomCapacitySchema = z.object({
  examScheduleRoomCapacityId: z.number({ required_error: "examScheduleRoomCapacityId is required" }),
  capacity: z.number(),
  columns: z.number(),
});

const deleteRoomCapacityParamsSchema = z.object({
  examScheduleRoomCapacityId: z.coerce.number().int().positive(),
});

const allocateSeatsSchema = z.object({
  examScheduleId: z.number({ required_error: "examScheduleId is required" }),
});

const availableRoomsQuerySchema = z.object({
  examScheduleId: z.coerce.number().int().positive(),
});

const getExamScheduleRoomsSchema = z.object({
  examScheduleId: z.coerce.number().int().positive(),
});

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });



const optionalPositiveIntegerIdList = z.preprocess((val) => {
  if (val === undefined || val === null || val === "" || val === "undefined") {
    return undefined;
  }
  const rawItems = Array.isArray(val) ? val : String(val).split(",");
  const ids = [];
  for (const item of rawItems) {
    if (item === "" || item == null) {
      continue;
    }
    ids.push(item);
  }
  return ids.length > 0 ? ids : undefined;
}, z.array(positiveIntegerId).min(1).optional());

const getExamScheduleStudentsSchema = z.object({
  page: z.coerce
    .number()
    .int("page must be an integer")
    .min(1, "page must be at least 1")
    .optional()
    .default(1),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1, "limit must be at least 1")
    .max(100, "limit must be at most 100")
    .optional()
    .default(10),
  search: z.string().trim().optional(),
  courseId: optionalPositiveIntegerIdList,
  sessionId: optionalPositiveIntegerIdList,
  term: optionalPositiveIntegerIdList,
  subjectId: optionalPositiveIntegerIdList,
  examScheduleId: z.coerce.number().int().positive().optional(),
});

const examScheduleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

router.get("/", userAuth, examScheduleController.getExamSchedules);

router.get(
  "/availableRooms",
  userAuth,
  validate({ query: availableRoomsQuerySchema }),
  examRoomCapacityController.getAvailableRoomsForExamSchedule,
);

router.get(
  "/roomAssignments",
  userAuth,
  validate({ query: getExamScheduleRoomsSchema }),
  examRoomCapacityController.getExamScheduleRooms,
);

router.get(
  "/students",
  userAuth,
  validate({ query: getExamScheduleStudentsSchema }),
  examScheduleController.getExamScheduleStudents,
);

router.get(
  "/my/:id",
  userAuth,
  validate({ params: examScheduleIdParamSchema }),
  examScheduleController.getMyExamScheduleById,
);

router.get("/:id", userAuth, examScheduleController.getExamScheduleById);

// add room to exam of branch
router.post(
  "/assignRoom",
  userAuth,
  checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ASSIGN_ROOMS.value, null),
  validate({ body: addExamRoomCapacitySchema }),
  examRoomCapacityController.addExamRoomCapacity,
);

router.put(
  "/roomAssignment",
  userAuth,
  checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ASSIGN_ROOMS.value, null),
  validate({ body: updateExamRoomCapacitySchema }),
  examRoomCapacityController.updateExamRoomCapacity,
);

router.delete(
  "/roomAssignment/:examScheduleRoomCapacityId",
  userAuth,
  checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ASSIGN_ROOMS.value, null),
  validate({ params: deleteRoomCapacityParamsSchema }),
  examRoomCapacityController.deleteExamRoomCapacity,
);

router.post(
  "/allocateSeats/randomly",
  userAuth,
  checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_SEAT_ALLOCATION.value, null),
  validate({ body: allocateSeatsSchema }),
  examScheduleController.allocateSeats,
);

router.post(
  "/allocateSeats/ascending",
  userAuth,
  checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_SEAT_ALLOCATION.value, null),
  validate({ body: allocateSeatsSchema }),
  examScheduleController.allocateSeatsAscending,
);

router.post(
  "/allocateSeats/descending",
  userAuth,
  checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_SEAT_ALLOCATION.value, null),
  validate({ body: allocateSeatsSchema }),
  examScheduleController.allocateSeatsDescending,
);

export default router;
