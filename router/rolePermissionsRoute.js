import {Router} from  'express'
const router =  Router();
import {addRolePermissions,getAllRolePermissions,getSingleRolePermissionsDetails,updateRolePermissions,deleteRolePermissions} from "../controllers/rolePermissionsController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addRolePermissions);

router.get('/', userAuth, getAllRolePermissions);

router.get('/single' ,userAuth, getSingleRolePermissionsDetails);

router.patch('/' ,userAuth, updateRolePermissions);

router.delete('/' ,userAuth, deleteRolePermissions);

export default router;