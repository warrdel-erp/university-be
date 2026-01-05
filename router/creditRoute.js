import {Router} from  'express'
const router =  Router();
import {addCredit,getAllCredit,getSingleCreditDetails,updateCredit,deleteCredit} from "../controllers/creditController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addCredit);

router.get('/', userAuth, getAllCredit);

router.get('/single' ,userAuth, getSingleCreditDetails);

router.patch('/' ,userAuth, updateCredit);

router.delete('/' ,userAuth, deleteCredit);

export default router;