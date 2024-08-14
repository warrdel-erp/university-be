import {addStudent ,getAllStudents ,getSingleStudentDetail,importStudentData,updateStudentDetails,deleteStudentDetail,getEmptyEnrollNumber,studentCourseMapping,classStudentMapping,addElectiveSubject,getclassStudentMapping} from "../controllers/studentController.js"

// router
import {Router} from  'express'
const router =  Router();

router.post('/', addStudent);

router.get('/all', getAllStudents);

router.get('/', getSingleStudentDetail);

router.post('/import', importStudentData);

router.patch('/:studentId', updateStudentDetails);

router.delete('/:studentId', deleteStudentDetail);

router.get('/emptyEnrollNumber', getEmptyEnrollNumber);

router.post('/studentMapping', studentCourseMapping);

router.post('/classStudentMapping', classStudentMapping);

router.get('/classStudentMapping', getclassStudentMapping);

router.post('/electiveSubject', addElectiveSubject);

// router.get('/electiveSubject', addElectiveSubject);

export default router;