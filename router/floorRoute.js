import {Router} from  'express'
const router =  Router();
import {addfloor,getAllfloor,getSinglefloorDetails,updatefloor,deletefloor} from "../controllers/floorController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addfloor);

router.get('/', userAuth, getAllfloor);

router.get('/single' ,userAuth, getSinglefloorDetails);

router.patch('/' ,userAuth, updatefloor);

router.delete('/' ,userAuth, deletefloor);

export default router;