import { Router } from 'express'
const router = Router();
import { addSyllabus, getAllSyllabus, getSingleSyllabusDetails, updateSyllabus, deleteSyllabus, courseAllSubject, addSyllabusUnit, syllabusUnitGet, semesterAllSubject } from "../controllers/syllabusController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addSyllabus);

router.get('/', userAuth, getAllSyllabus);

router.get('/single', userAuth, getSingleSyllabusDetails);

router.patch('/', userAuth, updateSyllabus);

router.delete('/', userAuth, deleteSyllabus);

router.get('/courseSubject', userAuth, courseAllSubject);

router.post('/addUnit', userAuth, addSyllabusUnit);

router.get('/getUnit', userAuth, syllabusUnitGet);

router.get('/semesterSubject', userAuth, semesterAllSubject);

export default router;