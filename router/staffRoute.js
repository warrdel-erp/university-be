import {Router} from  'express'
const router =  Router();
import {addStaff,getAllStaff,getSingleStaffDetails,updateStaff,deleteStaff} from "../controllers/staffController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addStaff);

router.get('/', userAuth, getAllStaff);

router.get('/single' ,userAuth, getSingleStaffDetails);

router.patch('/' ,userAuth, updateStaff);

router.delete('/' ,userAuth, deleteStaff);

export default router;