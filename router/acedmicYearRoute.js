import {Router} from  'express'
const router =  Router();
import {addacedmicYear,getAllacedmicYear,getSingleacedmicYearDetails,updateacedmicYear,deleteacedmicYear,getAllActiveAcedmicYear} from "../controllers/acedmicYearController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addacedmicYear);

router.get('/', userAuth, getAllacedmicYear);

router.get('/single' ,userAuth, getSingleacedmicYearDetails);

router.patch('/' ,userAuth, updateacedmicYear);

router.delete('/' ,userAuth, deleteacedmicYear);

router.get('/active', userAuth, getAllActiveAcedmicYear);

export default router;