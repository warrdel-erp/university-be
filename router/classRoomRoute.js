import {Router} from  'express'
const router =  Router();
import {addClassRoom,getAllClassRoom,getSingleClassRoomDetails,updateClassRoom,deleteClassRoom} from "../controllers/classRoomController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addClassRoom);

router.get('/', userAuth, getAllClassRoom);

router.get('/single' ,userAuth, getSingleClassRoomDetails);

router.patch('/' ,userAuth, updateClassRoom);

router.delete('/' ,userAuth, deleteClassRoom);

export default router;