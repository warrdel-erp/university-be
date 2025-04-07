import {Router} from  'express'
const router =  Router();
import {addSubAccount,getAllAccount,getAllSubAccount,getSingleSubAccountDetails,updateSubAccount,deleteSubAccount} from "../controllers/subAccountController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addSubAccount);

router.get('/', userAuth, getAllSubAccount);

router.get('/single' ,userAuth, getSingleSubAccountDetails);

router.patch('/' ,userAuth, updateSubAccount);

router.delete('/' ,userAuth, deleteSubAccount);

router.get('/account', userAuth, getAllAccount);

export default router;