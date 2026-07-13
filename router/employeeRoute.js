import { Router } from 'express';
import { z } from "zod";
const router = Router();
import { addEmployee, getAllEmployee, getSingleEmployeeDetails, deleteEmployeeDetail, importEmployeeData, updateEmployee, getBooksIssuedToEmployee, getTeacherTimeTable, getTeacherSubject, getSubjectEvalution, getTeacherCourses, getEmployeeSectionDates, getTeacherSubjectsFromSchedule } from '../controllers/employeeController.js';
import userAuth from "../middleware/authUser.js"
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';
import { getTodayClassSchedule, getPastClassSchedules, getUpcomingClassSchedules, getUniqueClassSectionSubjects, getSectionCounts } from '../controllers/employeeController.js';
import { validate } from "../utility/validation.js";

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const sectionDatesQuerySchema = z.object({
    classSectionTermId: positiveIntegerId,
    subjectId: z.string().regex(/^\d+$/, "subjectId must be a number").transform(val => parseInt(val)),
    userId: z.string().regex(/^\d+$/, "userId must be a number").transform(val => parseInt(val)),
});

const optionalPositiveId = z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    z.coerce.number().int().positive().optional(),
);

const scheduleQuerySchema = z.object({
    userId: z.coerce.number().int().positive(),
    date: z.string().optional(),
    sessionId: optionalPositiveId,
    groupPeriods: z.enum(['false', 'sessional', 'consecutive']).optional(),
    instituteId: optionalPositiveId,
    universityId: optionalPositiveId,
}).passthrough();

const uniqueClassSectionSubjectsQuerySchema = z.object({
    userId: positiveIntegerId,
});

const teacherSubjectQuerySchema = z.object({
    userId: positiveIntegerId,
    sessionId: optionalPositiveId,
    term: optionalPositiveId,
}).strict();

router.get(
    '/uniqueClassSectionSubjects',
    userAuth,
    checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null),
    validate({ query: uniqueClassSectionSubjectsQuerySchema }),
    getUniqueClassSectionSubjects,
);

router.get('/schedule', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), validate({ query: scheduleQuerySchema }), getTodayClassSchedule);

router.get('/sectionDates', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), validate({ query: sectionDatesQuerySchema }), getEmployeeSectionDates);

router.get('/sectionCounts', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getSectionCounts);

router.get('/pastSchedule', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getPastClassSchedules);
router.get('/upcomingSchedule', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getUpcomingClassSchedules);

router.get('/courses', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getTeacherCourses);

router.get('/coursesFromSchedule', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getTeacherSubjectsFromSchedule);

router.get('/evaluation', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getSubjectEvalution);

router.get('/cellData', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getTeacherTimeTable);

router.get('/subject', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), validate({ query: teacherSubjectQuerySchema }), getTeacherSubject);

router.get("/issuedBook", userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getBooksIssuedToEmployee);

router.post('/addEmp', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY_ADD.value, null), addEmployee);

router.get('/', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getAllEmployee);

router.get('/:id', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY.value, null), getSingleEmployeeDetails);

router.patch('/:id', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY_EDIT.value, null), updateEmployee);

router.delete('/:id', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY_DELETE.value, null), deleteEmployeeDetail);

router.post('/import', userAuth, checkAccess(PERMISSIONS.STAFF_PROFILES_IMPORT.value, null), importEmployeeData);


export default router;
