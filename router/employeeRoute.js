import { Router } from 'express';
import { z } from "zod";
const router = Router();
import { addEmployee, getAllEmployee, getSingleEmployeeDetails, deleteEmployeeDetail, importEmployeeData, updateEmployee, getBooksIssuedToEmployee, getTeacherTimeTable, getTeacherSubject, getSubjectEvalution, getTeacherCourses, getEmployeeSectionDates, getTeacherSubjectsFromSchedule } from '../controllers/employeeController.js';
import userAuth from "../middleware/authUser.js"
import { getTodayClassSchedule, getPastClassSchedules, getUpcomingClassSchedules, getUniqueClassSectionSubjects, getSectionCounts } from '../controllers/employeeController.js';
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

const optionalPositiveId = z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    z.coerce.number().int().positive().optional(),
);

const scheduleQuerySchema = z.object({
    employeeId: z.coerce.number().int().positive(),
    date: z.string().optional(),
    sessionId: optionalPositiveId,
    groupPeriods: z.enum(['true', 'false']).optional(),
    instituteId: optionalPositiveId,
    universityId: optionalPositiveId,
}).passthrough();

const uniqueClassSectionSubjectsQuerySchema = z.object({
    employeeId: positiveIntegerId,
});

router.get(
    '/uniqueClassSectionSubjects',
    userAuth,
    validate({ query: uniqueClassSectionSubjectsQuerySchema }),
    getUniqueClassSectionSubjects,
);

router.get('/schedule', userAuth, validate({ query: scheduleQuerySchema }), getTodayClassSchedule);

router.get('/sectionDates', userAuth, validate({ query: sectionDatesQuerySchema }), getEmployeeSectionDates);

router.get('/sectionCounts', userAuth, getSectionCounts);

router.get('/pastSchedule', userAuth, getPastClassSchedules);
router.get('/upcomingSchedule', userAuth, getUpcomingClassSchedules);

router.get('/courses', userAuth, getTeacherCourses);

router.get('/coursesFromSchedule', userAuth, getTeacherSubjectsFromSchedule);

router.get('/evaluation', userAuth, getSubjectEvalution);

router.get('/cellData', userAuth, getTeacherTimeTable);

router.get('/subject', userAuth, getTeacherSubject);

router.get("/issuedBook", userAuth, getBooksIssuedToEmployee);

router.post('/addEmp', userAuth, addEmployee);

router.get('/', userAuth, getAllEmployee);

router.get('/:id', userAuth, getSingleEmployeeDetails);

router.patch('/:id', userAuth, updateEmployee);

router.delete('/:id', userAuth, deleteEmployeeDetail);

router.post('/import', userAuth, importEmployeeData);


export default router; 
