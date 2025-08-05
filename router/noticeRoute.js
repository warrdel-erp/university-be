import { Router } from 'express'
const router = Router();
import {addNotice, getAllStudentNotice, getAllEmployeeNotice, updateNotice, deleteNotice} from "../controllers/noticeController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addNotice);

router.get('/studentNotice', userAuth, getAllStudentNotice);

router.get('/employee', userAuth, getAllEmployeeNotice);

router.patch('/', userAuth, updateNotice);

router.delete('/', userAuth, deleteNotice);

export default router;