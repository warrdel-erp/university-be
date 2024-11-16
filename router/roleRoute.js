import {Router} from  'express'
const router =  Router();
import {addRole,getAllRole,getSingleRoleDetails,updateRole,deleteRole} from "../controllers/roleController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addRole);

router.get('/', userAuth, getAllRole);

router.get('/single' ,userAuth, getSingleRoleDetails);

router.patch('/' ,userAuth, updateRole);

router.delete('/' ,userAuth, deleteRole);

export default router;