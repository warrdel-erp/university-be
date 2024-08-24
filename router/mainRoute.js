import {Router} from  'express';
const router =  Router();
import {getAllCollegesAndCourses,addCampus,addInstitute,addAffiliatedUniversity,addCourse,addSpecialization,addSubject,addClass,getClass,addClassSubjectMapper,getClassSubjectMapper,addSemester,getSemester} from '../controllers/mainController.js';

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

router.post('/semester', addSemester);

router.get('/semester', getSemester);


export default router;