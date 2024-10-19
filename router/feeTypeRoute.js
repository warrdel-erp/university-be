import {Router} from  'express'
const router =  Router();
import {addFeeType,getAllFeeType,getSingleFeeTypeDetails,updateFeeType,deleteFeeType} from "../controllers/feeTypeController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addFeeType);

router.get('/', userAuth, getAllFeeType);

router.get('/single' ,userAuth, getSingleFeeTypeDetails);

router.patch('/' ,userAuth, updateFeeType);

router.delete('/' ,userAuth, deleteFeeType);

export default router;