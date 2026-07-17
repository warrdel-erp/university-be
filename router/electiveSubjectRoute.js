import {Router} from  'express'
const router =  Router();
import {addElectiveSubject,getAllElectiveSubject,getSingleElectiveSubjectDetails,updateElectiveSubject,deleteElectiveSubject} from "../controllers/electiveSubjectController.js";
import userAuth from "../middleware/authUser.js"
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW_ADD.value, 'electiveSubject'), addElectiveSubject);

router.get('/', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW.value, null), getAllElectiveSubject);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW.value, null), getSingleElectiveSubjectDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW_EDIT.value, 'electiveSubject'), updateElectiveSubject);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW_DELETE.value, 'electiveSubject'), deleteElectiveSubject);

export default router;