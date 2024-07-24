import {addStudent ,getAllStudents ,getSingleStudentDetail,importStudentData,updateStudentDetails,deleteStudentDetail,getEmptyEnrollNumber } from "../controllers/studentController.js"

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

export default router;