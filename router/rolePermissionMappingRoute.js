import {Router} from  'express'
const router =  Router();
import {addRolePermissionMapping,getAllRolePermissionMapping,getSingleRolePermissionMappingDetails,updateRolePermissionMapping,deleteRolePermissionMapping} from "../controllers/rolePermissionMappingController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addRolePermissionMapping);

router.get('/', userAuth, getAllRolePermissionMapping);

router.get('/single' ,userAuth, getSingleRolePermissionMappingDetails);

router.patch('/' ,userAuth, updateRolePermissionMapping);

router.delete('/' ,userAuth, deleteRolePermissionMapping);

export default router;