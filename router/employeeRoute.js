import {Router} from  'express';
const router =  Router();

import {addEmployee,getAllEmployee,getSingleEmployeeDetails,deleteEmployeeDetail} from '../controllers/employeeController.js';

router.post('/addEmp', addEmployee);

router.get('/', getAllEmployee);

router.get('/:id', getSingleEmployeeDetails);

router.delete('/:id', deleteEmployeeDetail);

export default router;