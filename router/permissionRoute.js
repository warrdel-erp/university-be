import {Router} from  'express'
const router =  Router();
import {addPermission,getAllPermission,getSinglePermissionDetails,updatePermission,deletePermission} from "../controllers/permissionController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addPermission);

router.get('/', userAuth, getAllPermission);

router.get('/single' ,userAuth, getSinglePermissionDetails);

router.patch('/' ,userAuth, updatePermission);

router.delete('/' ,userAuth, deletePermission);

export default router;