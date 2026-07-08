import { Router } from 'express'
const router = Router();
import { addDepartmentStructure, getAlldepartmentStructure, getSingledepartmentStructureDetails, updatedepartmentStructure, deletedepartmentStructure } from "../controllers/departmentStructureController.js";
import userAuth from "../middleware/authUser.js"
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';

router.post('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_ADD.value, 'departmentStructure'), addDepartmentStructure);

router.get('/', userAuth, getAlldepartmentStructure);

router.get('/single', userAuth, getSingledepartmentStructureDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_EDIT.value, 'departmentStructure'), updatedepartmentStructure);

router.delete('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_DELETE.value, 'departmentStructure'), deletedepartmentStructure);

export default router;