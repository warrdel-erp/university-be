import {Router} from  'express';
const router =  Router();
import {getAllCollegesAndCourses,addCampus,addInstitute,addAffiliatedUniversity,addCourseLevel,addCourse,addSpecialization,addSubject,addClass,getClass,addClassSubjectMapper,getClassSubjectMapper} from '../controllers/mainController.js';

router.get('/all', getAllCollegesAndCourses);

router.post('/campus', addCampus);

router.post('/institute', addInstitute);

router.post('/affiliatedUniversity', addAffiliatedUniversity);

router.post('/affiliatedUniversity', addAffiliatedUniversity);

router.post('/course', addCourse);

router.post('/specialization', addSpecialization);

router.post('/subject', addSubject);

router.post('/class', addClass);

router.get('/class', getClass);

router.post('/classSubjectMapper', addClassSubjectMapper);

router.get('/classSubjectMapper', getClassSubjectMapper);

export default router;