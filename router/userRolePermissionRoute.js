import {Router} from  'express'
const router =  Router();
import {addUserRolePermission,getAllUserRolePermission,getSingleUserRolePermissionDetails,updateUserRolePermission,deleteUserRolePermission} from "../controllers/userRolePermissionController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addUserRolePermission);

router.get('/', userAuth, getAllUserRolePermission);

router.get('/single' ,userAuth, getSingleUserRolePermissionDetails);

router.patch('/' ,userAuth, updateUserRolePermission);

router.delete('/' ,userAuth, deleteUserRolePermission);

export default router;