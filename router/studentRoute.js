import {
  addStudent,
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
  getFeePlanId,
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

const addStudentWithFeePlanProfileBodySchema = z
  .object({
    feePlanProfileId: positiveIntegerId,
    universityId: positiveIntegerId,
    campusId: positiveIntegerId,
    instituteId: positiveIntegerId,
    affiliatedUniversityId: positiveIntegerId,
    courseLevelId: positiveIntegerId,
    courseId: positiveIntegerId,
    roleId: positiveIntegerId,
    classSectionsId: positiveIntegerId,
    acedmicYearId: positiveIntegerId,
    email: z.string().trim().min(1),
    sessionId: positiveIntegerId.optional(),
    semesterId: positiveIntegerId.optional(),
    enrollNumber: z.string().trim().optional(),
  })
  .passthrough();

// Legacy student routes
router.post("/", userAuth, addStudent);
router.get("/all", userAuth, getAllStudents);
router.get("/", userAuth, getSingleStudentDetail);
router.post("/import", userAuth, importStudentData);
router.patch("/:studentId", userAuth, updateStudentDetails);
router.delete("/:studentId", userAuth, deleteStudentDetail);
router.get("/emptyEnrollNumber", userAuth, getEmptyEnrollNumber);
router.post("/studentMapping", userAuth, studentCourseMapping);
router.post("/classStudentMapping", userAuth, classStudentMapping);
router.get("/classStudentMapping", userAuth, getclassStudentMapping);
router.post("/electiveSubject", userAuth, addElectiveSubject);
router.post("/promoteStudent", userAuth, promoteStudent);
router.get("/fee", userAuth, getFeePlanId);
router.get("/emptyfeeDetails", userAuth, getEmptyFeeDetails);
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
  "/withFeePlanProfile",
  userAuth,
  validate({ body: addStudentWithFeePlanProfileBodySchema }),
  addStudentWithFeePlanProfile
);

export default router;
