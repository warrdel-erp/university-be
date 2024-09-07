import {Router} from  'express'
const router =  Router();
import {teacherSubjectMapping,teacherSectionMapping,getTeacherSubjectMapping,getTeacherSectionMapping,updateTeacherSubjectMapping,updateTeacherSectionMapping,
    deleteTeacherSubjectMapping,deleteTeacherSectionMapping
} from "../controllers/teacherMappingController.js";
import userAuth from "../middleware/authUser.js"

router.post('/teacherSubject',userAuth , teacherSubjectMapping);

router.post('/teacherSection',userAuth , teacherSectionMapping);

router.get('/teacherSubject',userAuth , getTeacherSubjectMapping);

router.get('/teacherSection',userAuth , getTeacherSectionMapping);

router.patch('/teacherSubject',userAuth , updateTeacherSubjectMapping);

router.patch('/teacherSection',userAuth , updateTeacherSectionMapping);

router.delete('/:teacherSubjectMappingId',userAuth , deleteTeacherSubjectMapping);

router.delete('/:teacherSectionMappingId',userAuth , deleteTeacherSectionMapping);

export default router;