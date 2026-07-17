import {Router} from  'express'
const router =  Router();
import {addPo,getAllPo,getSinglePoDetails,updatePo,deletePo} from "../controllers/poController.js";
import userAuth from "../middleware/authUser.js"

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.PROGRAM_OUTCOME_ADD.value, null), addPo);

router.get('/', userAuth, checkAccess(PERMISSIONS.PROGRAM_OUTCOME.value, null), getAllPo);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.PROGRAM_OUTCOME.value, null), getSinglePoDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.PROGRAM_OUTCOME_EDIT.value, null), updatePo);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.PROGRAM_OUTCOME_DELETE.value, null), deletePo);

export default router;