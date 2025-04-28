import {Router} from  'express'
const router =  Router();
import {addSyllabus,getAllSyllabus,getSingleSyllabusDetails,updateSyllabus,deleteSyllabus} from "../controllers/syllabusController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addSyllabus);

router.get('/', userAuth, getAllSyllabus);

router.get('/single' ,userAuth, getSingleSyllabusDetails);

router.patch('/' ,userAuth, updateSyllabus);

router.delete('/' ,userAuth, deleteSyllabus);

export default router;