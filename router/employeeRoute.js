import { Router } from 'express';
const router = Router();
import { addEmployee, getAllEmployee, getSingleEmployeeDetails, deleteEmployeeDetail, importEmployeeData, updateEmployee, getBooksIssuedToEmployee, getTeacherTimeTable, getTeacherSubject, getSubjectEvalution } from '../controllers/employeeController.js';
import userAuth from "../middleware/authUser.js"
import { getTodayClassSchedule } from '../controllers/employeeController.js';

router.get('/todaySchedule', userAuth, getTodayClassSchedule);

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