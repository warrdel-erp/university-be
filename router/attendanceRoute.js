import {Router} from  'express'
const router =  Router();
import {addAttendance,getAttendanceDetails,updateAttendance,importAttendance,getAttendanceByDate,getPreviousClasses} from "../controllers/attendanceController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addAttendance);

router.get('/', userAuth, getAttendanceDetails);

router.patch('/' ,userAuth, updateAttendance);

router.post('/import',userAuth , importAttendance);

router.get('/byDate', userAuth, getAttendanceByDate);

router.get("/previous-classes/:employeeId",userAuth,getPreviousClasses);

export default router;