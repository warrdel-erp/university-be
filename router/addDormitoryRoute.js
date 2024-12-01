import {Router} from  'express'
const router =  Router();
import {addDormitoryRoom,getAllDormitoryRoom,getSingleDormitoryRoomDetails,updateDormitoryRoom,deleteDormitoryRoom} from "../controllers/addDormitoryController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addDormitoryRoom);

router.get('/', userAuth, getAllDormitoryRoom);

router.get('/single' ,userAuth, getSingleDormitoryRoomDetails);

router.patch('/' ,userAuth, updateDormitoryRoom);

router.delete('/' ,userAuth, deleteDormitoryRoom);

export default router;