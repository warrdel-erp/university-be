import { Router } from 'express';
import { z } from "zod";
const router = Router();
import { addEmployee, getAllEmployee, getSingleEmployeeDetails, deleteEmployeeDetail, importEmployeeData, updateEmployee, getBooksIssuedToEmployee, getTeacherTimeTable, getTeacherSubject, getSubjectEvalution, getTeacherCourses, getEmployeeClassDates, getTeacherSubjectsFromSchedule } from '../controllers/employeeController.js';
import userAuth from "../middleware/authUser.js"
import { getTodayClassSchedule, getPastClassSchedules, getUpcomingClassSchedules, getUniqueClassSectionSubjects, getClassCounts } from '../controllers/employeeController.js';
import { validate } from "../utility/validation.js";

const studentAttendanceReportSchema = z.object({
    classSectionId: z.string().regex(/^\d+$/, "classSectionId must be a number").transform(val => parseInt(val)),
    subjectId: z.string().regex(/^\d+$/, "subjectId must be a number").transform(val => parseInt(val)),
    employeeId: z.string().regex(/^\d+$/, "employeeId must be a number").transform(val => parseInt(val)),
});

router.get('/uniqueClassSectionSubjects', userAuth, getUniqueClassSectionSubjects);

router.get('/schedule', userAuth, getTodayClassSchedule);

router.get('/classDates', userAuth, validate({ query: studentAttendanceReportSchema }), getEmployeeClassDates);

router.get('/classCounts', userAuth, getClassCounts);

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
