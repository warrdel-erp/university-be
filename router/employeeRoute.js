import {Router} from  'express';
const router =  Router();

import {addEmployee,getAllEmployee,getSingleEmployeeDetails,deleteEmployeeDetail} from '../controllers/employeeController.js';
import userAuth from "../middleware/authUser.js"

router.post('/addEmp',userAuth , addEmployee);

router.get('/',userAuth , getAllEmployee);

router.get('/:id',userAuth , getSingleEmployeeDetails);

router.delete('/:id',userAuth , deleteEmployeeDetail);

export default router;