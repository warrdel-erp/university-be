import { Router } from 'express';
const router = Router();
import { addEmployee, getAllEmployee, getSingleEmployeeDetails, deleteEmployeeDetail, importEmployeeData, updateEmployee, getBooksIssuedToEmployee, getTeacherTimeTable, getTeacherSubject, getSubjectEvalution, getTeacherCourses } from '../controllers/employeeController.js';
import userAuth from "../middleware/authUser.js"
import { getTodayClassSchedule, getPastClassSchedules, getUpcomingClassSchedules, getUniqueClassSectionSubjects } from '../controllers/employeeController.js';

router.get('/uniqueClassSectionSubjects', userAuth, getUniqueClassSectionSubjects);
router.get('/schedule', userAuth, getTodayClassSchedule);

router.get('/pastSchedule', userAuth, getPastClassSchedules);

router.get('/upcomingSchedule', userAuth, getUpcomingClassSchedules);

router.get('/courses', userAuth, getTeacherCourses);

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
