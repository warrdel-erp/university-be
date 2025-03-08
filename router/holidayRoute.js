import {Router} from  'express'
const router =  Router();
import {addHoliday,getAllHoliday,getSingleHolidayDetails,updateHoliday,deleteHoliday} from "../controllers/holidayController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addHoliday);

router.get('/', userAuth, getAllHoliday);

router.get('/single' ,userAuth, getSingleHolidayDetails);

router.patch('/' ,userAuth, updateHoliday);

router.delete('/' ,userAuth, deleteHoliday);

export default router;