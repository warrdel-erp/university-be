import {Router} from  'express'
const router =  Router();
import {
    addElectiveSubject,
    getAllElectiveSubject,
    getSingleElectiveSubjectDetails,
    updateElectiveSubject,
    deleteElectiveSubject,
    getMappedStudents,
    getEligibleStudents,
    mapStudents,
    unmapStudent
} from "../controllers/electiveSubjectController.js";
import userAuth from "../middleware/authUser.js"
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { z } from "zod";
import { validate } from "../utility/validation.js";

const electiveSubjectQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

router.post('/', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW_ADD.value, 'electiveSubject'), addElectiveSubject);

router.get('/', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW.value, null), validate({ query: electiveSubjectQuerySchema }), getAllElectiveSubject);

router.get('/single', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW.value, null), getSingleElectiveSubjectDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW_EDIT.value, 'electiveSubject'), updateElectiveSubject);

router.delete('/', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW_DELETE.value, 'electiveSubject'), deleteElectiveSubject);

router.get('/mapped-students', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW.value, null), getMappedStudents);

router.get('/eligible-students', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW.value, null), getEligibleStudents);

router.post('/map-students', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW_EDIT.value, 'electiveSubject'), mapStudents);

router.delete('/unmap-student', userAuth, checkAccess(PERMISSIONS.ELECTIVE_SUBJECT_NEW_EDIT.value, 'electiveSubject'), unmapStudent);

export default router;