import {addStudent ,getAllStudents ,getSingleStudentDetail,importStudentData,updateStudentDetails,deleteStudentDetail,getEmptyEnrollNumber,studentCourseMapping,classStudentMapping,addElectiveSubject,getclassStudentMapping,promoteStudent} from "../controllers/studentController.js"
import userAuth from "../middleware/authUser.js"
// router
import {Router} from  'express'
const router =  Router();

router.post('/',userAuth , addStudent);

router.get('/all',userAuth , getAllStudents);

router.get('/',userAuth , getSingleStudentDetail);

router.post('/import',userAuth , importStudentData);

router.patch('/:studentId',userAuth , updateStudentDetails);

router.delete('/:studentId',userAuth , deleteStudentDetail);

router.get('/emptyEnrollNumber',userAuth , getEmptyEnrollNumber);

router.post('/studentMapping',userAuth , studentCourseMapping);

router.post('/classStudentMapping',userAuth , classStudentMapping);

router.get('/classStudentMapping',userAuth , getclassStudentMapping);

router.post('/electiveSubject',userAuth , addElectiveSubject);

router.post('/promoteStudent',userAuth , promoteStudent);

router.get('/electiveSubject',userAuth, addElectiveSubject);

export default router;