import {Router} from  'express'
const router =  Router();
import {addFeePlan,getAllFeePlan,getSingleFeePlanDetails,updateFeePlan,deleteFeePlan} from "../controllers/feePlanController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addFeePlan);

router.get('/', userAuth, getAllFeePlan);

router.get('/single' ,userAuth, getSingleFeePlanDetails);

router.patch('/' ,userAuth, updateFeePlan);

router.delete('/' ,userAuth, deleteFeePlan);

export default router;