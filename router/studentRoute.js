import {
  addStudentWithFeePlanProfile,
  getAllStudents,
  getSingleStudentDetail,
  importStudentData,
  updateStudentDetails,
  deleteStudentDetail,
  getEmptyEnrollNumber,
  studentCourseMapping,
  sectionStudentMapping,
  addElectiveSubject,
  getSectionStudentMapping,
  promoteStudent,
  getPromotionAvailableSection,
  getPromotionStudentList,
  getStudentPromotionHistory,
  getFeePlanInitiate,
  getEmptyFeeDetails,
  getStudentsByFeePlanList,
  getStudentSubject,
  getFeeDetailsByStudentId,
  getBooksIssuedToStudent,
  getStudentTimeTable,
  getStudentsByClassSection,
  getAllAnswerSheets,
} from "../controllers/studentController.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { z } from "zod";
import { Router } from "express";
import { ROLES } from "../const/roles.js";
import { studentAdmissionStatus, studentStatus } from "../constant.js";
import { ErrorResponse } from "../utility/response.js";

const router = Router();

/** FE key → DB/model key */
const KEY_ALIASES = {
  admissionDate: "admisssionDate",
  additionalNotes: "AdditionalNotes",
};

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const requiredFeePlanProfileId = z.coerce
  .number({
    required_error: "feePlanProfileId is required",
    invalid_type_error: "feePlanProfileId must be a number",
  })
  .int({ message: "feePlanProfileId must be an integer" });

const dateField = z.string().trim().min(1, "date is required");

const optionalPositiveIntegerId = z.preprocess(
  emptyToUndefined,
  positiveIntegerId.optional(),
);

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().optional(),
);

const optionalNonEmptyString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email().optional(),
);

const optionalDateField = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const nullableAffiliatedUniversityId = z.preprocess(
  (val) => (val === '' || val === undefined || val === null ? null : val),
  z.union([z.null(), positiveIntegerId]),
);

const admissionStatusField = z
  .union([
    z.enum(studentAdmissionStatus),
    z.coerce.number().int().positive(),
    z.string().trim().min(1),
  ])
  .optional();

const studentStatusField = z
  .union([z.enum(studentStatus), z.coerce.number().int().positive()])
  .optional();

const parseJsonInput = (val) => {
  if (val == null || val === "" || val === "[]" || val === "{}") return undefined;
  if (typeof val === "string") {
    return JSON.parse(val);
  }
  return val;
};

const entranceDetailsField = z.preprocess(
  parseJsonInput,
  z.array(z.record(z.string(), z.any())).optional(),
);

const allDropDownDataField = z.preprocess(
  parseJsonInput,
  z
    .object({
      studentId: z.coerce.number().optional().nullable(),
      type: z.array(z.coerce.number().int().positive()),
      code: z.array(z.coerce.number().int().positive()),
    })
    .refine((d) => d.type.length === d.code.length, {
      message: "Types and codes arrays must be of the same length",
    })
    .optional(),
);

const jsonObjectField = z.preprocess(
  parseJsonInput,
  z.record(z.string(), z.any()).optional(),
);


const classSectionStudentsQuerySchema = z.object({
  timeTableMappingId: positiveIntegerId,
  date: dateField,
  academicYearId: optionalPositiveIntegerId,
  groupPeriods: z.union([z.boolean(), z.string()]).optional(),
}).passthrough();

const studentSharedOptionalFields = {
  specializationId: optionalPositiveIntegerId,
  term: optionalPositiveIntegerId,
  classSectionTermId: optionalPositiveIntegerId,
  scholarNumber: optionalNonEmptyString,
  enrollNumber: optionalNonEmptyString,
  middleName: optionalString,
  lastName: optionalString,
  motherName: optionalString,
  annualIncome: z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional()),
  admissionDate: optionalDateField,
  enrollDate: optionalDateField,
  studentAdmissionStatus: z.preprocess(emptyToUndefined, admissionStatusField),
  currentClass: optionalString,
  mobileNumber: optionalString,
  parentEmail: optionalEmail,
  parentNumber: optionalString,
  aadharNumber: optionalString,
  panNumber: optionalString,
  placeOfBirth: optionalString,
  pAddress: optionalString,
  pPincode: z.preprocess(emptyToUndefined, z.coerce.number().int().optional()),
  pCountry: optionalString,
  pState: optionalString,
  pCity: optionalString,
  cAddress: optionalString,
  cPincode: z.preprocess(emptyToUndefined, z.coerce.number().int().optional()),
  cCountry: optionalString,
  cState: optionalString,
  cCity: optionalString,
  bankName: optionalString,
  accountNumber: optionalString,
  ifscCode: optionalString,
  studentStatus: z.preprocess(emptyToUndefined, studentStatusField),
  cancelDate: optionalDateField,
  cancelReason: optionalString,
  additionalNotes: optionalString,
  generalRemark: optionalString,
  gender: optionalPositiveIntegerId,
  caste: optionalPositiveIntegerId,
  religion: optionalPositiveIntegerId,
  bloodGroup: optionalPositiveIntegerId,
  entranceDetails: entranceDetailsField,
  allDropDownData: allDropDownDataField,
  addressDetails: jsonObjectField,
  corsAddress: jsonObjectField,
};

/** Same keys as create — all optional on PATCH */
const studentUpdateBodyFields = {
  studentId: optionalPositiveIntegerId,
  feePlanProfileId: z.preprocess(emptyToUndefined, requiredFeePlanProfileId.optional()),
  universityId: optionalPositiveIntegerId,
  campusId: optionalPositiveIntegerId,
  instituteId: optionalPositiveIntegerId,
  affiliatedUniversityId: nullableAffiliatedUniversityId.optional(),
  courseLevelId: optionalPositiveIntegerId,
  courseId: optionalPositiveIntegerId,
  roleId: z.literal(ROLES.STUDENT).optional(),
  sessionId: optionalPositiveIntegerId,
  email: optionalEmail,
  firstName: optionalNonEmptyString,
  fatherName: optionalNonEmptyString,
  phoneNumber: optionalNonEmptyString,
  birthDate: optionalDateField,
  ...studentSharedOptionalFields,
};

const importStudentBodySchema = z.object({
  campusId: positiveIntegerId,
  instituteId: positiveIntegerId,
  sessionId: positiveIntegerId,
  courseLevelId: positiveIntegerId,
  courseId: positiveIntegerId,
  classSectionTermId: positiveIntegerId,
  academicYearId: optionalPositiveIntegerId,
  acedmicYearId: optionalPositiveIntegerId,
  affiliatedUniversityId: nullableAffiliatedUniversityId.optional(),
  universityId: optionalPositiveIntegerId,
  roleId: z.union([z.literal(ROLES.STUDENT), positiveIntegerId]).optional(),
});

const addStudentWithFeePlanProfileBodySchema = z.object({
  feePlanProfileId: requiredFeePlanProfileId,
  universityId: positiveIntegerId,
  campusId: positiveIntegerId,
  instituteId: positiveIntegerId,
  affiliatedUniversityId: nullableAffiliatedUniversityId.optional(),
  courseLevelId: positiveIntegerId,
  courseId: positiveIntegerId,
  roleId: z.literal(ROLES.STUDENT).default(ROLES.STUDENT),
  sessionId: positiveIntegerId,
  email: z.string().trim().email(),
  firstName: z.string().trim().min(1),
  fatherName: z.string().trim().min(1),
  phoneNumber: z.string().trim().min(1),
  birthDate: dateField,
  ...studentSharedOptionalFields,
  classSectionTermId: positiveIntegerId,
});

const updateStudentDetailsParamsSchema = z.object({
  studentId: positiveIntegerId,
});

const updateStudentDetailsBodySchema = z.object(studentUpdateBodyFields);

const getAllAnswerSheetsQuerySchema = z.object({
  examScheduleId: z.coerce
    .number()
    .int("examScheduleId must be an integer")
    .positive("examScheduleId must be greater than 0"),
});

const emptyFeeDetailsQuerySchema = z.object({
  courseId: positiveIntegerId.optional(),
  sessionId: positiveIntegerId.optional(),
  year: positiveIntegerId.optional(),
  search: z.string().trim().optional(),
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
});

const studentIdQuerySchema = z.object({
  studentId: positiveIntegerId,
});

const feePlanProfilesAllQuerySchema = z.object({
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
    .default(20),
});

const feePlanStudentsQuerySchema = z.object({
  courseId: optionalPositiveIntegerId,
  year: optionalPositiveIntegerId,
  term: optionalPositiveIntegerId,
  feePlanProfileId: optionalPositiveIntegerId,
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
});

const getAllStudentsQuerySchema = z.object({
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
  courseId: positiveIntegerId.optional(),
});

const mapStudentBody = (req, res, next) => {
  try {
    const body = { ...req.body };
    for (const [from, to] of Object.entries(KEY_ALIASES)) {
      if (body[from] != null && body[to] == null) body[to] = body[from];
      delete body[from];
    }
    const admStatus = Number(body.studentAdmissionStatus);
    if (admStatus >= 1 && admStatus <= studentAdmissionStatus.length) {
      body.studentAdmissionStatus = studentAdmissionStatus[admStatus - 1];
    } else if (
      body.studentAdmissionStatus === 0 ||
      body.studentAdmissionStatus === "0"
    ) {
      delete body.studentAdmissionStatus;
    }
    if (body.studentStatus === 0 || body.studentStatus === "0") {
      delete body.studentStatus;
    } else if (body.studentStatus != null && body.studentStatus !== "") {
      const statusIndex = Number(body.studentStatus);
      if (
        Number.isInteger(statusIndex) &&
        statusIndex >= 1 &&
        statusIndex <= studentStatus.length
      ) {
        body.studentStatus = studentStatus[statusIndex - 1];
      }
    }
    if (body.currentClass === "") delete body.currentClass;
    if (body.affiliatedUniversityId === "") {
      body.affiliatedUniversityId = null;
    }
    req.body = body;
    next();
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Invalid student payload");
  }
};

const mapStudentImportBody = (req, res, next) => {
  try {
    const body = { ...req.body };

    if (body.acedmicYearId != null && body.academicYearId == null) {
      body.academicYearId = body.acedmicYearId;
    }
    delete body.acedmicYearId;

    const hasLegacySemester =
      body.semesterId != null && body.semesterId !== "";
    const hasLegacySection =
      body.classSectionsId != null && body.classSectionsId !== "";

    if (
      (hasLegacySemester || hasLegacySection) &&
      (body.classSectionTermId == null || body.classSectionTermId === "")
    ) {
      return ErrorResponse(
        res,
        400,
        "classSectionTermId is required; semesterId and classSectionsId are no longer supported",
      );
    }

    delete body.semesterId;
    delete body.classSectionsId;

    if (body.affiliatedUniversityId === "") {
      body.affiliatedUniversityId = null;
    }

    req.body = body;
    next();
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Invalid import payload");
  }
};

router.get(
  "/all",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: getAllStudentsQuerySchema }),
  getAllStudents
);
router.get(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: studentIdQuerySchema }),
  getSingleStudentDetail
);

router.patch(
  "/:studentId",
  userAuth,
  checkAccess(PERMISSIONS.ADD_STUDENT_EDIT.value, null),
  validate({
    params: updateStudentDetailsParamsSchema,
    body: updateStudentDetailsBodySchema,
  }),
  mapStudentBody,
  updateStudentDetails
);
router.delete("/:studentId", userAuth, checkAccess(PERMISSIONS.ADD_STUDENT_DELETE.value, null), deleteStudentDetail);

const emptyEnrollNumberQuerySchema = z.object({
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
});

router.get(
  "/emptyEnrollNumber",
  userAuth,
  validate({ query: emptyEnrollNumberQuerySchema }),
  getEmptyEnrollNumber
);
const sectionStudentMappingBodySchema = z.object({
  studentId: z.union([positiveIntegerId, z.array(positiveIntegerId)]),
  classSectionTermId: positiveIntegerId,
}).passthrough();

const promoteStudentBodySchema = z.union([
  z.object({
    studentId: positiveIntegerId,
    classSectionTermId: positiveIntegerId,
  }),
  z.array(
    z.object({
      studentId: positiveIntegerId,
      classSectionTermId: positiveIntegerId,
    }),
  ),
]);

const sectionStudentMappingQuerySchema = z.object({
  classSectionTermId: z.coerce.number().int().nonnegative().optional(),
  term: z.coerce.number().int().positive().optional(),
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
});

router.post("/studentMapping", userAuth, checkAccess(PERMISSIONS.ADD_STUDENT_MAPPING.value, null), studentCourseMapping);
router.post(
  "/sectionStudentMapping",
  userAuth,
  checkAccess(PERMISSIONS.ADD_STUDENT_ADD.value, null),
  validate({ body: sectionStudentMappingBodySchema }),
  sectionStudentMapping,
);
router.get(
  "/sectionStudentMapping",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: sectionStudentMappingQuerySchema }),
  getSectionStudentMapping,
);
router.post("/electiveSubject", userAuth, checkAccess(PERMISSIONS.ADD_STUDENT_ADD_ELECTIVE.value, null), addElectiveSubject);

const promotionStudentListQuerySchema = z.object({
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
    .default(20),
  programCourseId: positiveIntegerId,
  studentSearch: z.string().trim().optional(),
  promotionTerm: z.coerce.number().int().positive().optional(),
});

router.get(
  "/promotion/list",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: promotionStudentListQuerySchema }),
  getPromotionStudentList,
);

const promotionHistoryQuerySchema = z
  .object({
    studentId: positiveIntegerId.optional(),
    programCourseId: positiveIntegerId.optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    studentSearch: z.string().trim().optional(),
    promotionTerm: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => data.studentId != null || data.programCourseId != null, {
    message: "studentId or programCourseId is required",
  });

router.get(
  "/promotion/history",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: promotionHistoryQuerySchema }),
  getStudentPromotionHistory,
);

const promotionAvailableClassSectionQuerySchema = z.object({
  courseId: z.coerce.number({ required_error: "courseId is required" }).int().positive(),
  /** Student's current program term or the next promotion term */
  term: z.coerce.number({ required_error: "term is required" }).int().positive(),
  classSectionTermId: z.coerce
    .number({ required_error: "classSectionTermId is required" })
    .int()
    .positive(),
});

router.post(
  "/promoteStudent",
  userAuth,
  checkAccess(PERMISSIONS.ADD_STUDENT_ADD.value, null),
  validate({ body: promoteStudentBodySchema }),
  promoteStudent,
);

router.get(
  "/promotion/available-section",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: promotionAvailableClassSectionQuerySchema }),
  getPromotionAvailableSection,
);

router.get(
  "/feePlanStudents",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_FEE_PLANS.value, null),
  validate({ query: feePlanStudentsQuerySchema }),
  getStudentsByFeePlanList,
);
router.get(
  "/feePlanProfiles/all",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: feePlanProfilesAllQuerySchema }),
  getFeePlanInitiate
);
router.get(
  "/emptyfeeDetails",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: emptyFeeDetailsQuerySchema }),
  getEmptyFeeDetails
);
router.get("/:studentId/studentSubject", userAuth, checkAccess(PERMISSIONS.STUDENT_LIST.value, null), getStudentSubject);
router.get("/:studentId/feeDetails", userAuth, checkAccess(PERMISSIONS.STUDENT_LIST.value, null), getFeeDetailsByStudentId);
router.get("/issuedBook", userAuth, checkAccess(PERMISSIONS.STUDENT_LIST.value, null), getBooksIssuedToStudent);
router.get("/studentTimetable", userAuth, checkAccess(PERMISSIONS.STUDENT_LIST.value, null), getStudentTimeTable);
router.get(
  "/classSectionStudents",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: classSectionStudentsQuerySchema }),
  getStudentsByClassSection,
);
router.get(
  "/getallanswerSheetQrs",
  userAuth,
  checkAccess(PERMISSIONS.STUDENT_LIST.value, null),
  validate({ query: getAllAnswerSheetsQuerySchema }),
  getAllAnswerSheets
);
router.get(
  "/:studentId",
  userAuth,
  validate({ params: updateStudentDetailsParamsSchema }),
  getSingleStudentDetail,
);

router.post(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.ADD_STUDENT_ADD.value, null),
  validate({ body: addStudentWithFeePlanProfileBodySchema }),
  mapStudentBody,
  addStudentWithFeePlanProfile
);

router.post(
  "/import",
  userAuth,
  mapStudentImportBody,
  validate({ body: importStudentBodySchema }),
  importStudentData,
);


export default router;
