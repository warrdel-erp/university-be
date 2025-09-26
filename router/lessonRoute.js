import {Router} from  'express'
const router =  Router();
import {addLesson,getAllLesson,getSingleLessonDetails,addTopice,addMapping,getMapping,updateMapping,updateCompleteMapping,deleteMapping} from "../controllers/lessonController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addLesson);

router.get('/', userAuth, getAllLesson);

router.get('/single' ,userAuth, getSingleLessonDetails);

router.post('/topic', userAuth, addTopice);

router.post('/mapping', userAuth, addMapping);

router.get('/mapping', userAuth, getMapping);

router.patch('/', userAuth, updateMapping);

router.patch('/mapping/:lessonMappingId', userAuth, updateCompleteMapping);

router.delete('/mapping/:lessonMappingId', userAuth, deleteMapping);

export default router;