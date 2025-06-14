import {Router} from  'express'
const router =  Router();
import {addPo,getAllPo,getSinglePoDetails,updatePo,deletePo} from "../controllers/poController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addPo);

router.get('/', userAuth, getAllPo);

router.get('/single' ,userAuth, getSinglePoDetails);

router.patch('/' ,userAuth, updatePo);

router.delete('/' ,userAuth, deletePo);

export default router;