import {Router} from  'express';
const router =  Router();

import {addEmployee,getAllEmployee} from '../controllers/employeeController.js';

router.post('/addEmp', addEmployee);

router.get('/', getAllEmployee);

export default router;