import {Router} from  'express';
const router =  Router();
import {getAllCollegesAndCourses,addCampus,addInstitute,addAffiliatedUniversity,addCourseLevel,addCourse,addSpecialization} from '../controllers/mainController.js';

router.get('/all', getAllCollegesAndCourses);

router.post('/campus', addCampus);

router.post('/institute', addInstitute);

router.post('/affiliatedUniversity', addAffiliatedUniversity);

router.post('/affiliatedUniversity', addAffiliatedUniversity);

router.post('/courseLevel', addCourseLevel);

router.post('/course', addCourse);

router.post('/specialization', addSpecialization);

export default router;