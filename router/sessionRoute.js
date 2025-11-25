import {Router} from  'express'
const router =  Router();
import {addSession,getAllSession,getSingleSessionDetails,updateSession,deleteSession,couseSessionMapping,updateCouseSessionMapping} from "../controllers/sessionController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addSession);

router.get('/', userAuth, getAllSession);

router.get('/single' ,userAuth, getSingleSessionDetails);

router.patch('/' ,userAuth, updateSession);

router.delete('/' ,userAuth, deleteSession);

router.post('/courseSessionMapping' ,userAuth, couseSessionMapping);

router.patch('/courseSessionMapping/update' ,userAuth, updateCouseSessionMapping);

export default router;