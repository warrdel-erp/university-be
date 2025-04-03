import {Router} from  'express'
const router =  Router();
import {addDepartment,getAllDepartment,getSingleDepartmentDetails,updateDepartment,deleteDepartment} from "../controllers/departmentController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addDepartment);

router.get('/', userAuth, getAllDepartment);

router.get('/single' ,userAuth, getSingleDepartmentDetails);

router.patch('/' ,userAuth, updateDepartment);

router.delete('/' ,userAuth, deleteDepartment);

export default router;