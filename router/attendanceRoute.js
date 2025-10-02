import {Router} from  'express'
const router =  Router();
import {addAttendance,getAttendanceDetails,updateAttendance,importAttendance} from "../controllers/attendanceController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addAttendance);

router.get('/', userAuth, getAttendanceDetails);

router.patch('/' ,userAuth, updateAttendance);

router.post('/import',userAuth , importAttendance);

export default router;