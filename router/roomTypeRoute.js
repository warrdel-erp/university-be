import {Router} from  'express'
const router =  Router();
import {addRoomType,getAllRoomType,getSingleRoomTypeDetails,updateRoomType,deleteRoomType} from "../controllers/roomTypeController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addRoomType);

router.get('/', userAuth, getAllRoomType);

router.get('/single' ,userAuth, getSingleRoomTypeDetails);

router.patch('/' ,userAuth, updateRoomType);

router.delete('/' ,userAuth, deleteRoomType);

export default router;