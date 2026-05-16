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
  getFeePlanProfiles,
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

const router = Router();

const getAllAnswerSheetsQuerySchema = z.object({
  examScheduleId: z.coerce
    .number()
    .int("examScheduleId must be an integer")
    .positive("examScheduleId must be greater than 0"),
});

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

/** Rejects null/empty before coerce (z.coerce.number(null) → 0). */
const requiredFeePlanProfileId = z.coerce
  .number({
    required_error: "feePlanProfileId is required",
    invalid_type_error: "feePlanProfileId must be a number",
  })
  .int({ message: "feePlanProfileId must be an integer" });

const acedmicYearIdQuerySchema = z.object({
  acedmicYearId: positiveIntegerId,
});

const courseSessionIdQuerySchema = z.object({
  courseSessionId: positiveIntegerId,
});

const studentIdQuerySchema = z.object({
  studentId: positiveIntegerId,
});

const dateField = z.string().trim().min(1, "date is required");

const addStudentWithFeePlanProfileBodySchema = z.object({
  feePlanProfileId: requiredFeePlanProfileId,
  universityId: positiveIntegerId,
  campusId: positiveIntegerId,
  instituteId: positiveIntegerId,
  affiliatedUniversityId: positiveIntegerId,
  courseLevelId: positiveIntegerId,
  courseId: positiveIntegerId,
  roleId: z.literal(ROLES.STUDENT).default(ROLES.STUDENT),
  classSectionsId: positiveIntegerId,
  acedmicYearId: positiveIntegerId,
  sessionId: positiveIntegerId,
  email: z.string().trim().email(),
  enrollNumber: z.string().trim().min(1).optional(),
  firstName: z.string().trim().min(1),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  fatherName: z.string().trim().min(1),
  motherName: z.string().trim().optional(),
  annualIncome: z.coerce.number().nonnegative().optional(),
  birthDate: dateField,
  admisssionDate: dateField.optional(),
  enrollDate: dateField.optional(),
  phoneNumber: z.string().trim().min(1),
  mobileNumber: z.string().trim().optional(),
  parentEmail: z.string().trim().email().optional(),
  parentNumber: z.string().trim().optional(),
  aadharNumber: z.string().trim().optional(),
  placeOfBirth: z.string().trim().optional(),
  pAddress: z.string().trim().optional(),
  pPincode: z.coerce.number().int().optional(),
  pCountry: z.string().trim().optional(),
  pState: z.string().trim().optional(),
  pCity: z.string().trim().optional(),
  cAddress: z.string().trim().optional(),
  cPincode: z.coerce.number().int().optional(),
  cCountry: z.string().trim().optional(),
  cState: z.string().trim().optional(),
  cCity: z.string().trim().optional(),
  entranceDetails: z.any().optional(),
  semesterId: positiveIntegerId.optional(),
});

// Student routes (create via POST /withFeePlanProfile — fee v2)
router.get("/all", userAuth, getAllStudents);
router.get(
  "/",
  userAuth,
  validate({ query: studentIdQuerySchema }),
  getSingleStudentDetail
);
router.post("/import", userAuth, importStudentData);
router.patch("/:studentId", userAuth, updateStudentDetails);
router.delete("/:studentId", userAuth, deleteStudentDetail);
router.get("/emptyEnrollNumber", userAuth, getEmptyEnrollNumber);
router.post("/studentMapping", userAuth, studentCourseMapping);
router.post("/classStudentMapping", userAuth, classStudentMapping);
router.get("/classStudentMapping", userAuth, getclassStudentMapping);
router.post("/electiveSubject", userAuth, addElectiveSubject);
router.post("/promoteStudent", userAuth, promoteStudent);
router.get(
  "/fee",
  userAuth,
  validate({ query: courseSessionIdQuerySchema }),
  getFeePlanProfiles
);
router.get("/feePlanProfiles/all", userAuth, getFeePlanInitiate);
router.get(
  "/emptyfeeDetails",
  userAuth,
  validate({ query: acedmicYearIdQuerySchema }),
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

// Fee v2 — create student with fee plan profile; invoice per term via POST /studentFeeInvoice
router.post(
  "/",
  userAuth,
  validate({ body: addStudentWithFeePlanProfileBodySchema }),
  addStudentWithFeePlanProfile
);

export default router;
