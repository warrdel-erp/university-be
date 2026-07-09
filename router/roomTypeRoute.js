import {Router} from  'express'
const router =  Router();
import {addRoomType,getAllRoomType,getSingleRoomTypeDetails,updateRoomType,deleteRoomType} from "../controllers/roomTypeController.js";
import userAuth from "../middleware/authUser.js"

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.EXAM_ROOM_ALLOCATE_ADD.value, null), addRoomType);

router.get('/', userAuth, checkAccess(PERMISSIONS.EXAM_ROOM_ALLOCATE.value, null), getAllRoomType);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.EXAM_ROOM_ALLOCATE.value, null), getSingleRoomTypeDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.EXAM_ROOM_ALLOCATE_EDIT.value, null), updateRoomType);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.EXAM_ROOM_ALLOCATE_DELETE.value, null), deleteRoomType);

export default router;