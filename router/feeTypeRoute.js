import {Router} from  'express'
const router =  Router();
import {addFeeType,getAllFeeType,getSingleFeeTypeDetails,updateFeeType,deleteFeeType} from "../controllers/feeTypeController.js";
import userAuth from "../middleware/authUser.js"

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.FEES_TYPE_ADD.value, null), addFeeType);

router.get('/', userAuth, checkAccess(PERMISSIONS.FEES_TYPE.value, null), getAllFeeType);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.FEES_TYPE.value, null), getSingleFeeTypeDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.FEES_TYPE_EDIT.value, null), updateFeeType);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.FEES_TYPE_DELETE.value, null), deleteFeeType);

export default router;