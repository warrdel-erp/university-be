import {Router} from  'express'
const router =  Router();
import {teacherSubjectMapping,teacherSectionMapping,getTeacherSubjectMapping,getTeacherSectionMapping} from "../controllers/teacherMappingController.js"

router.post('/teacherSubject', teacherSubjectMapping);

router.post('/teacherSection', teacherSectionMapping);

router.get('/teacherSubject', getTeacherSubjectMapping);

router.get('/teacherSection', getTeacherSectionMapping);


export default router;