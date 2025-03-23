import {Router} from  'express'
const router =  Router();
import {addElectiveSubject,getAllElectiveSubject,getSingleElectiveSubjectDetails,updateElectiveSubject,deleteElectiveSubject} from "../controllers/electiveSubjectController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addElectiveSubject);

router.get('/', userAuth, getAllElectiveSubject);

router.get('/single' ,userAuth, getSingleElectiveSubjectDetails);

router.patch('/' ,userAuth, updateElectiveSubject);

router.delete('/' ,userAuth, deleteElectiveSubject);

export default router;