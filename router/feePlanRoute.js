import {Router} from  'express'
const router =  Router();
import {addFeePlan,getAllFeePlan,getSingleFeePlanDetails,updateFeePlan,deleteFeePlan} from "../controllers/feePlanController.js";
import userAuth from "../middleware/authUser.js"

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.FEES_PLAN_ADD.value, null), addFeePlan);

router.get('/', userAuth, checkAccess(PERMISSIONS.FEES_PLAN.value, null), getAllFeePlan);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.FEES_PLAN.value, null), getSingleFeePlanDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value, null), updateFeePlan);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value, null), deleteFeePlan);

export default router;