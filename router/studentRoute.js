import { addStudent, getAllStudents, getSingleStudentDetail, importStudentData, updateStudentDetails, deleteStudentDetail, getEmptyEnrollNumber, studentCourseMapping, classStudentMapping, addElectiveSubject, getclassStudentMapping, promoteStudent, getFeePlanId, getEmptyFeeDetails, getStudentSubject, getFeeDetailsByStudentId, getBooksIssuedToStudent, getStudentTimeTable, getStudentsByClassSection, getAllAnswerSheets } from "../controllers/studentController.js"
import userAuth from "../middleware/authUser.js"
import { validate } from "../utility/validation.js"
import { z } from "zod"
// router
import { Router } from 'express'
const router = Router();

const getAllAnswerSheetsQuerySchema = z.object({
    examSetupTypeTermId: z.coerce
        .number()
        .int("examSetupTypeTermId must be an integer")
        .positive("examSetupTypeTermId must be greater than 0"),
    sessionId: z.coerce
        .number()
        .int("sessionId must be an integer")
        .positive("sessionId must be greater than 0"),
    examScheduleId: z.coerce
        .number()
        .int("examScheduleId must be an integer")
        .positive("examScheduleId must be greater than 0"),
});

router.post('/', userAuth, addStudent);

router.get('/all', userAuth, getAllStudents);

router.get('/', userAuth, getSingleStudentDetail);

router.post('/import', userAuth, importStudentData);

router.patch('/:studentId', userAuth, updateStudentDetails);

router.delete('/:studentId', userAuth, deleteStudentDetail);

router.get('/emptyEnrollNumber', userAuth, getEmptyEnrollNumber);

router.post('/studentMapping', userAuth, studentCourseMapping);

router.post('/classStudentMapping', userAuth, classStudentMapping);

router.get('/classStudentMapping', userAuth, getclassStudentMapping);

router.post('/electiveSubject', userAuth, addElectiveSubject);

router.post('/promoteStudent', userAuth, promoteStudent);

router.get('/fee', userAuth, getFeePlanId);

router.get('/emptyfeeDetails', userAuth, getEmptyFeeDetails);

router.get('/:studentId/studentSubject', userAuth, getStudentSubject);

router.get('/:studentId/feeDetails', userAuth, getFeeDetailsByStudentId);

router.get("/issuedBook", userAuth, getBooksIssuedToStudent);

router.get("/studentTimetable", userAuth, getStudentTimeTable);

router.get('/classSectionStudents', userAuth, getStudentsByClassSection);

router.get("/getallanswerSheetQrs", userAuth, validate({ query: getAllAnswerSheetsQuerySchema }), getAllAnswerSheets);

export default router;