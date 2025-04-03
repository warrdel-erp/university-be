import {Router} from  'express'
const router =  Router();
import {addHead,getAllHead,getSingleHeadDetails,updateHead,deleteHead} from "../controllers/headController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addHead);

router.get('/', userAuth, getAllHead);

router.get('/single' ,userAuth, getSingleHeadDetails);

router.patch('/' ,userAuth, updateHead);

router.delete('/' ,userAuth, deleteHead);

export default router;