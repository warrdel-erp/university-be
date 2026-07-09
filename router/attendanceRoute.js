import { Router } from 'express'
import { z } from "zod";
const router = Router();
import { addAttendance, copyAttendancePeriod, getCopyAttendancePeriod, getAttendanceDetails, updateAttendance, importAttendance, importBulkAttendance, getAttendanceByDate, getPreviousSessions, getStudentAttendanceReport, getStudentsBatchAttendance, getEmployeeSectionDates } from "../controllers/attendanceController.js";
import userAuth from "../middleware/authUser.js"
import { validate } from "../utility/validation.js";

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const sectionDatesQuerySchema = z.object({
    classSectionTermId: positiveIntegerId,
    subjectId: z.string().regex(/^\d+$/, "subjectId must be a number").transform(val => parseInt(val)),
    employeeId: z.string().regex(/^\d+$/, "employeeId must be a number").transform(val => parseInt(val)),
});

/** Legacy — bulk report not migrated yet */
const bulkAttendanceReportSchema = z.object({
    classSectionId: z.string().regex(/^\d+$/, "classSectionId must be a number").transform(val => parseInt(val)),
    subjectId: z.string().regex(/^\d+$/, "subjectId must be a number").transform(val => parseInt(val)),
    employeeId: z.string().regex(/^\d+$/, "employeeId must be a number").transform(val => parseInt(val)),
});

const batchAttendanceSchema = z.object({
    classSectionTermId: positiveIntegerId,
    filters: z.array(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
        timeTableMappingId: z.number()
    })).min(1)
});

const attendanceStatusEnum = z.enum([
    "Present",
    "Absent",
    "Medical Leave",
    "Duty Leave",
    "Sports Leave",
    "NCC Leave",
    "Approved Leave",
    "Holiday",
]);

const addAttendanceSchema = z.object({
    classSectionTermId: positiveIntegerId,
    timeTableMappingId: z.union([
        z.coerce.number().int().positive(),
        z.array(z.coerce.number().int().positive()).min(1),
    ]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    attendance: z.array(z.object({
        studentId: z.coerce.number().int().positive(),
        attendanceStatus: attendanceStatusEnum,
        notes: z.string().optional(),
        description: z.string().optional(),
    })).min(1),
    section: z.string().optional(),
});

const copyAttendancePeriodSchema = z.object({
    classSectionTermId: positiveIntegerId,
    sourceTimeTableMappingId: positiveIntegerId,
    sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "sourceDate must be YYYY-MM-DD"),
    targetTimeTableMappingId: z.union([
        z.coerce.number().int().positive(),
        z.array(z.coerce.number().int().positive()).min(1),
    ]),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "targetDate must be YYYY-MM-DD"),
});

const copyAttendancePeriodQuerySchema = z.object({
    timeTableMappingId: positiveIntegerId,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

const attendanceByDateQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    classSectionTermId: positiveIntegerId,
    employeeId: positiveIntegerId,
});

router.post('/', userAuth, validate({ body: addAttendanceSchema }), addAttendance);


router.post('/copyPeriod', userAuth, validate({ body: copyAttendancePeriodSchema }), copyAttendancePeriod);
router.get('/copyPeriod', userAuth, validate({ query: copyAttendancePeriodQuerySchema }), getCopyAttendancePeriod);


router.get('/', userAuth, getAttendanceDetails);

router.patch('/', userAuth, updateAttendance);

// @deprecated
router.post('/import', userAuth, importAttendance);

router.post('/excelImport', userAuth, importBulkAttendance);

router.get('/byDate', userAuth, validate({ query: attendanceByDateQuerySchema }), getAttendanceByDate);

router.get("/previous-sessions/:employeeId", userAuth, getPreviousSessions);

router.get("/studentAttendance/bulk", userAuth, validate({ query: bulkAttendanceReportSchema }), getStudentAttendanceReport);

router.post('/getStudentAttendance/batch', userAuth, validate({ body: batchAttendanceSchema }), getStudentsBatchAttendance);

router.get('/sectionDates', userAuth, validate({ query: sectionDatesQuerySchema }), getEmployeeSectionDates);

export default router;
