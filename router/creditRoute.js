import {Router} from  'express'
const router =  Router();
import {addCredit,getAllCredit,getSingleCreditDetails,updateCredit,deleteCredit} from "../controllers/creditController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';

router.post('/', userAuth, checkAccess(PERMISSIONS.CREDITS_ASSIGN.value, null), addCredit);

router.get('/', userAuth, getAllCredit);

router.get('/single' ,userAuth, getSingleCreditDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.CREDITS_ASSIGN.value, null), updateCredit);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.CREDITS_ASSIGN.value, null), deleteCredit);

export default router;