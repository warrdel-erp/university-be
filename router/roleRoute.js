import {Router} from  'express'
const router =  Router();
import {addRole,getAllRole,getSingleRoleDetails,updateRole,deleteRole,getRolePermissions,assignRolePermissions} from "../controllers/roleController.js";
import userAuth from "../middleware/authUser.js"
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, addRole);
router.get('/', userAuth, getAllRole);
router.get('/single' ,userAuth, getSingleRoleDetails);
router.patch('/' ,userAuth, updateRole);
router.delete('/' ,userAuth, deleteRole);

router.get('/permissions/:roleId', userAuth, getRolePermissions);
router.post('/permissions/assign', userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL_ASSIGN.value, 'institute'), assignRolePermissions);

export default router;