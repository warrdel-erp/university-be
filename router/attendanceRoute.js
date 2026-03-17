import { Router } from 'express'
import { z } from "zod";
const router = Router();
import { addAttendance, getAttendanceDetails, updateAttendance, importAttendance, getAttendanceByDate, getPreviousClasses, getStudentAttendanceReport, getStudentsBatchAttendance } from "../controllers/attendanceController.js";
import userAuth from "../middleware/authUser.js"
import { validate } from "../utility/validation.js";

const studentAttendanceReportSchema = z.object({
    classSectionId: z.string().regex(/^\d+$/, "classSectionId must be a number").transform(val => parseInt(val)),
    subjectId: z.string().regex(/^\d+$/, "subjectId must be a number").transform(val => parseInt(val)),
    employeeId: z.string().regex(/^\d+$/, "employeeId must be a number").transform(val => parseInt(val)),
});

const batchAttendanceSchema = z.object({
    classSectionId: z.number(),
    filters: z.array(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
        timeTableMappingId: z.number()
    }))
});

router.post('/', userAuth, addAttendance);

router.get('/', userAuth, getAttendanceDetails);

router.patch('/', userAuth, updateAttendance);

router.post('/import', userAuth, importAttendance);

router.get('/byDate', userAuth, getAttendanceByDate);

router.get("/previous-classes/:employeeId", userAuth, getPreviousClasses);

router.get("/studentAttendance/bulk", userAuth, validate({ query: studentAttendanceReportSchema }), getStudentAttendanceReport);

router.post('/getStudentAttendance/batch', userAuth, validate({ body: batchAttendanceSchema }), getStudentsBatchAttendance);

export default router;