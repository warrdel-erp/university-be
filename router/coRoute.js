import {Router} from  'express'
const router =  Router();
import {addCo,
    getAllCo,getSingleCoDetails,updateCo,deleteCo,addCoWeightage,getAllCoWeightage,getSingleCoDetailsWeightage,updateCoWeightage
} from "../controllers/coController.js";
import userAuth from "../middleware/authUser.js"

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME_ADD.value, null), addCo);

router.get('/', userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME.value, null), getAllCo);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME.value, null), getSingleCoDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME_ADD.value, null), updateCo);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME_ADD.value, null), deleteCo);

router.post('/weightage', userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME_ADD.value, null), addCoWeightage);

router.get('/weightage', userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME.value, null), getAllCoWeightage);

router.get('/single/weightage' ,userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME.value, null), getSingleCoDetailsWeightage);

router.patch('/weightage' ,userAuth, checkAccess(PERMISSIONS.COURSE_OUTCOME_ADD.value, null), updateCoWeightage);

export default router;