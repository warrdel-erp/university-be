import { Router } from "express";
import { z } from "zod";
import {
  addTimeTable,
  addTimeTablePeriod,
  addStructureCourseMapping,
  getTimeTableDetails,
  getAllTimeTableName,
  getSingleTimeTableDetails,
  getStructureMappingPrintData,
  updateTimeTable,
  deleteTimeTable,
  updateStructure,
  deleteTimeTableName,
  deleteStructureCourseMapping,
  cloneTimeTableStructure,
  copyTimeTableStructure,
  addTimeTableVariant,
} from "../controllers/timeTableController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number()
  .int("id must be an integer")
  .positive("id must be greater than 0");

const optionalPositiveId = z.preprocess(
  (val) => (val === "" || val == null ? undefined : val),
  positiveIntegerId.optional(),
);

const addTimeTableSchema = z
  .object({
    name: z.string().trim().min(1, "name is required"),
    maximumPeriod: z.coerce.number().int().positive(),
    periodLength: z.coerce.number().int().positive().optional(),
    periodGap: z.coerce.number().int().min(0).optional(),
    startingTime: z.string().optional(),
    type: z.enum(["Automatic", "Manual"]),
    weekOff: z.array(z.string()).optional(),
    isCourse: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "Automatic") {
      return;
    }
    if (!data.startingTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startingTime is required for Automatic type",
        path: ["startingTime"],
      });
    }
    if (data.periodLength == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodLength is required for Automatic type",
        path: ["periodLength"],
      });
    }
    if (data.periodGap == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodGap is required for Automatic type",
        path: ["periodGap"],
      });
    }
  });

const variantMappingItemSchema = z
  .object({
    timeTableStructureVariantId: positiveIntegerId,
    startingDate: z.string().min(1, "startingDate is required"),
    endingDate: z.string().min(1, "endingDate is required"),
  })
  .refine((data) => new Date(data.endingDate) >= new Date(data.startingDate), {
    message: "variant endingDate cannot be before startingDate",
    path: ["endingDate"],
  });

const addStructureCourseMappingSchema = z
  .object({
    timeTableNameId: positiveIntegerId,
    courseId: optionalPositiveId,
    academicGroupScopeId: optionalPositiveId,
    timeTableStructureVariantId: optionalPositiveId,
    sessionId: positiveIntegerId,
    startingDate: z.string().min(1, "startingDate is required"),
    endingDate: z.string().min(1, "endingDate is required"),
    variants: z.array(variantMappingItemSchema).min(1, "variants array cannot be empty").optional(),
  })
  .refine((data) => data.courseId != null || data.academicGroupScopeId != null, {
    message: "Either courseId or academicGroupScopeId must be provided",
  })
  .refine((data) => !(data.courseId != null && data.academicGroupScopeId != null), {
    message: "Provide either courseId or academicGroupScopeId, not both",
  })
  .refine((data) => new Date(data.endingDate) >= new Date(data.startingDate), {
    message: "endingDate cannot be before startingDate",
    path: ["endingDate"],
  });

const updateTimeTableItemSchema = z.object({
  timeTableCreationId: positiveIntegerId,
  timeTableStructureVariantId: optionalPositiveId,
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  periodName: z.string().optional(),
  isCourse: z.boolean().optional(),
  isBreak: z.boolean().optional(),
  type: z.enum(["Automatic", "Manual"]).optional(),
});

const updateTimeTableSchema = z
  .array(updateTimeTableItemSchema)
  .min(1, "request body must be a non-empty array");

const addTimeTablePeriodSchema = z.object({
  timeTableNameId: positiveIntegerId,
  periodName: z.string().trim().min(1, "periodName cannot be empty").optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  type: z.enum(["Automatic", "Manual"]).optional(),
  isCourse: z.boolean().optional(),
  isBreak: z.boolean().optional(),
});

const cloneTimeTableStructureSchema = z.object({
  timeTableNameId: positiveIntegerId,
  name: z.string().trim().min(1, "name cannot be empty").optional(),
});

const addTimeTableVariantSchema = z.object({
  timeTableNameId: positiveIntegerId,
  name: z.string().trim().min(1, "name is required"),
  isDefault: z.boolean().optional(),
  periods: z.array(z.object({
    timeTableStructurePeriodsId: positiveIntegerId,
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    isCourse: z.boolean().optional(),
  })).optional(),
});

const copyTimeTableStructureSchema = z.object({
  timeTableNameId: positiveIntegerId,
  name: z.string().trim().min(1, "name cannot be empty").optional(),
});

const deleteTimeTableQuerySchema = z.object({
  timeTableCreationId: positiveIntegerId,
});

const getSingleStructureQuerySchema = z.object({
  timeTableNameId: positiveIntegerId,
});

const getStructureMappingPrintQuerySchema = z.object({
  timetableStructureCourseMapperId: optionalPositiveId,
  timeTableNameId: optionalPositiveId,
  courseId: optionalPositiveId,
  academicGroupScopeId: optionalPositiveId,
  sessionId: optionalPositiveId,
});

const getAllTimeTableNameQuerySchema = z.object({
  courseId: optionalPositiveId,
  sessionId: optionalPositiveId,
});

const updateStructureSchema = z
  .object({
    timetableStructureCourseMapperId: positiveIntegerId,
    timeTableNameId: positiveIntegerId.optional(),
    timeTableStructureVariantId: optionalPositiveId,
    courseId: positiveIntegerId.optional(),
    sessionId: positiveIntegerId.optional(),
    startingDate: z.string().min(1).optional(),
    endingDate: z.string().min(1).optional(),
    variants: z.array(variantMappingItemSchema).min(1).optional(),
  })
  .refine(
    (data) =>
      data.timeTableNameId ||
      data.timeTableStructureVariantId ||
      data.courseId ||
      data.sessionId ||
      data.startingDate ||
      data.endingDate ||
      (Array.isArray(data.variants) && data.variants.length > 0),
    { message: "Provide at least one field to update" },
  )
  .refine(
    (data) =>
      !data.startingDate ||
      !data.endingDate ||
      new Date(data.endingDate) >= new Date(data.startingDate),
    {
      message: "endingDate cannot be before startingDate",
      path: ["endingDate"],
    },
  );

const deleteTimeTableNameQuerySchema = z.object({
  timeTableNameId: positiveIntegerId,
});

const deleteStructureCourseMappingQuerySchema = z.object({
  timetableStructureCourseMapperId: positiveIntegerId,
});

// ---------------------------------------------------------------------------
// 1. Structure template — create / edit periods
// ---------------------------------------------------------------------------
router.post(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null),
  validate({ body: addTimeTableSchema }),
  addTimeTable,
);

router.post(
  "/structure/clone",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null),
  validate({ body: cloneTimeTableStructureSchema }),
  cloneTimeTableStructure,
);

router.post(
  "/variant",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null),
  validate({ body: addTimeTableVariantSchema }),
  addTimeTableVariant,
);

router.post(
  "/copy",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null),
  validate({ body: copyTimeTableStructureSchema }),
  copyTimeTableStructure,
);

router.post(
  "/period",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null),
  validate({ body: addTimeTablePeriodSchema }),
  addTimeTablePeriod,
);
router.patch(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_EDIT.value, null),
  validate({ body: updateTimeTableSchema }),
  updateTimeTable,
);
router.delete(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_DELETE.value, null),
  validate({ query: deleteTimeTableQuerySchema }),
  deleteTimeTable,
);

// ---------------------------------------------------------------------------
// 2. Course mapping — bind structure → course + session + dates
// ---------------------------------------------------------------------------
router.post(
  "/courseMapping",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null),
  validate({ body: addStructureCourseMappingSchema }),
  addStructureCourseMapping,
);
router.patch(
  "/structure",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_EDIT.value, null),
  validate({ body: updateStructureSchema }),
  updateStructure,
);
router.delete(
  "/courseMapping",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_DELETE.value, null),
  validate({ query: deleteStructureCourseMappingQuerySchema }),
  deleteStructureCourseMapping,
);

const getTimeTableDetailsQuerySchema = z.object({
  courseId: optionalPositiveId,
  sessionId: optionalPositiveId,
});

// ---------------------------------------------------------------------------
// 3. Read / list — UI lists, dropdowns, print table
// ---------------------------------------------------------------------------
router.get(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
  validate({ query: getTimeTableDetailsQuerySchema }),
  getTimeTableDetails,
);
router.get(
  "/all_name",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
  validate({ query: getAllTimeTableNameQuerySchema }),
  getAllTimeTableName,
);
router.get(
  "/single",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
  validate({ query: getSingleStructureQuerySchema }),
  getSingleTimeTableDetails,
);
router.get(
  "/structureMappings",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
  validate({ query: getStructureMappingPrintQuerySchema }),
  getStructureMappingPrintData,
);

// ---------------------------------------------------------------------------
// 4. Delete structure — only when no course/program is mapped
// ---------------------------------------------------------------------------
router.delete(
  "/structure",
  userAuth,
  checkAccess(PERMISSIONS.TIME_TABLE_SETUP_DELETE.value, null),
  validate({ query: deleteTimeTableNameQuerySchema }),
  deleteTimeTableName,
);

export default router;
