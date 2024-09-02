import {Router} from  'express'
const router =  Router();
import {teacherSubjectMapping,teacherSectionMapping,getTeacherSubjectMapping,getTeacherSectionMapping} from "../controllers/teacherMappingController.js";
import userAuth from "../middleware/authUser.js"

router.post('/teacherSubject',userAuth , teacherSubjectMapping);

router.post('/teacherSection',userAuth , teacherSectionMapping);

router.get('/teacherSubject',userAuth , getTeacherSubjectMapping);

router.get('/teacherSection',userAuth , getTeacherSectionMapping);


export default router;