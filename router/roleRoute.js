import {Router} from  'express'
const router =  Router();
import {
  addRole,
  getAllRole,
  getSingleRoleDetails,
  updateRole,
  deleteRole,
  getRolePermissions,
  assignRolePermissions,
  getRoleBaseScope,
  assignRoleBaseScope
} from "../controllers/roleController.js";
import userAuth from "../middleware/authUser.js"
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL_ADD.value, null), addRole);
router.get('/', userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, null), getAllRole);
router.get('/single' ,userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, null), getSingleRoleDetails);
router.patch('/' ,userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, null), updateRole);
router.delete('/' ,userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, null), deleteRole);

router.get('/permissions/:roleId', userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, null), getRolePermissions);
router.post('/permissions/assign', userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL_ASSIGN.value, 'institute'), assignRolePermissions);

router.get('/base-scope/:roleId', userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, null), getRoleBaseScope);
router.post('/base-scope', userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL_ASSIGN.value, 'institute'), assignRoleBaseScope);

export default router;
