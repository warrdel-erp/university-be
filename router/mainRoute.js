import {Router} from  'express';
const router =  Router();
import {getAllCollegesAndCourses,addCampus,addInstitute,addAffiliatedUniversity,addCourse,addSpecialization,addSubject,addClass,getClass,addClassSubjectMapper,getClassSubjectMapper,addSemester,getSemester,createClass,subjectExcel,changeCourseStatus,getClassSpecific,getClassRecord,updateSubject,getMonthlyIncome} from '../controllers/mainController.js';
import userAuth  from '../middleware/authUser.js'

router.get('/all', userAuth , getAllCollegesAndCourses);

router.post('/campus',userAuth, addCampus);

router.post('/institute',userAuth, addInstitute);

router.post('/affiliatedUniversity',userAuth, addAffiliatedUniversity);

router.post('/affiliatedUniversity', userAuth,addAffiliatedUniversity);

router.post('/course',userAuth, addCourse);

router.patch('/course',userAuth, changeCourseStatus);

router.post('/specialization',userAuth, addSpecialization);

router.post('/subject',userAuth, addSubject);

router.patch('/subject/update',userAuth, updateSubject);

router.post('/class',userAuth, addClass);

router.get('/class',userAuth, getClass);

router.get('/classSpecific',userAuth, getClassSpecific);

router.post('/classSubjectMapper',userAuth, addClassSubjectMapper);

router.get('/classSubjectMapper',userAuth, getClassSubjectMapper);

router.post('/semester',userAuth, addSemester);

router.get('/semester',userAuth, getSemester);

router.post('/createClass',userAuth, createClass);

router.post('/subjectExcel',userAuth, subjectExcel);

router.get('/classRecord',userAuth, getClassRecord);

router.get("/monthly-income", getMonthlyIncome);

export default router;