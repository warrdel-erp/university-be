import {
  addStudentWithFeePlanProfile,
  getAllStudents,
  getSingleStudentDetail,
  importStudentData,
  updateStudentDetails,
  deleteStudentDetail,
  getEmptyEnrollNumber,
  studentCourseMapping,
  classStudentMapping,
  addElectiveSubject,
  getclassStudentMapping,
  promoteStudent,
  getPromotionAvailableClassSection,
  getPromotionStudentList,
  getStudentPromotionHistory,
  getFeePlanInitiate,
  getEmptyFeeDetails,
  getStudentSubject,
  getFeeDetailsByStudentId,
  getBooksIssuedToStudent,
  getStudentTimeTable,
  getStudentsByClassSection,
  getAllAnswerSheets,
} from "../controllers/studentController.js";
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

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

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

const optionalPositiveIntegerId = z.preprocess(
  emptyToUndefined,
  positiveIntegerId.optional(),
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

const studentSharedOptionalFields = {
  specializationId: optionalPositiveIntegerId,
  semesterId: optionalPositiveIntegerId,
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
  classSectionsId: optionalPositiveIntegerId,
  sessionId: optionalPositiveIntegerId,
  email: optionalEmail,
  firstName: optionalNonEmptyString,
  fatherName: optionalNonEmptyString,
  phoneNumber: optionalNonEmptyString,
  birthDate: optionalDateField,
  ...studentSharedOptionalFields,
};

const addStudentWithFeePlanProfileBodySchema = z.object({
  feePlanProfileId: requiredFeePlanProfileId,
  universityId: positiveIntegerId,
  campusId: positiveIntegerId,
  instituteId: positiveIntegerId,
  affiliatedUniversityId: nullableAffiliatedUniversityId.optional(),
  courseLevelId: positiveIntegerId,
  courseId: positiveIntegerId,
  roleId: z.literal(ROLES.STUDENT).default(ROLES.STUDENT),
  classSectionsId: positiveIntegerId,
  sessionId: positiveIntegerId,
  email: z.string().trim().email(),
  firstName: z.string().trim().min(1),
  fatherName: z.string().trim().min(1),
  phoneNumber: z.string().trim().min(1),
  birthDate: dateField,
  ...studentSharedOptionalFields,
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

const acedmicYearIdQuerySchema = z.object({
  acedmicYearId: positiveIntegerId,
});

const emptyFeeDetailsQuerySchema = z.object({
  acedmicYearId: positiveIntegerId,
  courseId: positiveIntegerId.optional(),
  sessionId: positiveIntegerId.optional(),
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

router.get(
  "/all",
  userAuth,
  validate({ query: getAllStudentsQuerySchema }),
  getAllStudents
);
router.get(
  "/",
  userAuth,
  validate({ query: studentIdQuerySchema }),
  getSingleStudentDetail
);
router.post("/import", userAuth, importStudentData);

router.patch(
  "/:studentId",
  userAuth,
  validate({
    params: updateStudentDetailsParamsSchema,
    body: updateStudentDetailsBodySchema,
  }),
  mapStudentBody,
  updateStudentDetails
);
router.delete("/:studentId", userAuth, deleteStudentDetail);

router.get("/emptyEnrollNumber", userAuth, getEmptyEnrollNumber);
router.post("/studentMapping", userAuth, studentCourseMapping);
router.post("/classStudentMapping", userAuth, classStudentMapping);
router.get("/classStudentMapping", userAuth, getclassStudentMapping);
router.post("/electiveSubject", userAuth, addElectiveSubject);

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
  validate({ query: promotionHistoryQuerySchema }),
  getStudentPromotionHistory,
);

router.post("/promoteStudent", userAuth, promoteStudent);

const promotionAvailableClassSectionQuerySchema = z.object({
  courseId: z.coerce.number({ required_error: "courseId is required" }).int().positive(),
  term: z.coerce.number({ required_error: "term is required" }).int().positive(),
  classSectionId: z.coerce
    .number({ required_error: "classSectionId is required" })
    .int()
    .positive(),
});

router.get(
  "/promotion/available-class-section",
  userAuth,
  validate({ query: promotionAvailableClassSectionQuerySchema }),
  getPromotionAvailableClassSection,
);

router.get(
  "/feePlanProfiles/all",
  userAuth,
  validate({ query: feePlanProfilesAllQuerySchema }),
  getFeePlanInitiate
);
router.get(
  "/emptyfeeDetails",
  userAuth,
  validate({ query: emptyFeeDetailsQuerySchema }),
  getEmptyFeeDetails
);
router.get("/:studentId/studentSubject", userAuth, getStudentSubject);
router.get("/:studentId/feeDetails", userAuth, getFeeDetailsByStudentId);
router.get("/issuedBook", userAuth, getBooksIssuedToStudent);
router.get("/studentTimetable", userAuth, getStudentTimeTable);
router.get("/classSectionStudents", userAuth, getStudentsByClassSection);
router.get(
  "/getallanswerSheetQrs",
  userAuth,
  validate({ query: getAllAnswerSheetsQuerySchema }),
  getAllAnswerSheets
);

router.post(
  "/",
  userAuth,
  validate({ body: addStudentWithFeePlanProfileBodySchema }),
  mapStudentBody,
  addStudentWithFeePlanProfile
);

export default router;
