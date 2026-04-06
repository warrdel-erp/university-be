import { Router } from 'express';
const router = Router();
import * as optionsController from '../controllers/optionsController.js';
import userAuth from '../middleware/authUser.js';

router.get('/affiliatedUniversity', userAuth, optionsController.getAffiliatedUniversityOptions);

router.get('/courses', userAuth, optionsController.getCourseOptions);

router.get('/courseTerms', userAuth, optionsController.getTermOptions);

router.get('/classSections', userAuth, optionsController.getClassSectionOptions);

router.get('/specializations', userAuth, optionsController.getSpecializationOptions);

router.get('/subjects', userAuth, optionsController.getSubjectOptions);

export default router;

