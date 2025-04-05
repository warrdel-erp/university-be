import {Router} from  'express'
const router =  Router();
import {addDepartmentStructure,getAlldepartmentStructure,getSingledepartmentStructureDetails,updatedepartmentStructure,deletedepartmentStructure} from "../controllers/departmentStructureController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addDepartmentStructure);

router.get('/', userAuth, getAlldepartmentStructure);

router.get('/single' ,userAuth, getSingledepartmentStructureDetails);

router.patch('/' ,userAuth, updatedepartmentStructure);

router.delete('/' ,userAuth, deletedepartmentStructure);

export default router;