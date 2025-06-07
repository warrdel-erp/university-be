import {Router} from  'express'
const router =  Router();
import {addacedmicYear,getAllacedmicYear,getSingleacedmicYearDetails,updateacedmicYear,deleteacedmicYear,getAllActiveAcedmicYear,activateAcedmicYear} from "../controllers/acedmicYearController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addacedmicYear);

router.get('/', userAuth, getAllacedmicYear);

router.get('/single' ,userAuth, getSingleacedmicYearDetails);

router.patch('/' ,userAuth, updateacedmicYear);

router.delete('/' ,userAuth, deleteacedmicYear);

router.get('/active', userAuth, getAllActiveAcedmicYear);

router.post('/newActivate', userAuth, activateAcedmicYear);

export default router;