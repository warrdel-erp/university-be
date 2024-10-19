import {Router} from  'express'
const router =  Router();
import {addFeeGroup,getAllFeeGroup,getSingleFeeGroupDetails,updateFeeGroup,deleteFeeGroup} from "../controllers/feeGroupController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addFeeGroup);

router.get('/', userAuth, getAllFeeGroup);

router.get('/single' ,userAuth, getSingleFeeGroupDetails);

router.patch('/' ,userAuth, updateFeeGroup);

router.delete('/' ,userAuth, deleteFeeGroup);

export default router;