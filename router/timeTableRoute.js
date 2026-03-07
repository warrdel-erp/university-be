import { Router } from 'express'
const router = Router();
import { addTimeTable, getTimeTableDetails, getSingleTimeTableDetails, updateTimeTable, deleteTimeTable, getAllTimeTableName } from "../controllers/timeTableController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addTimeTable);

router.get('/all_name', userAuth, getAllTimeTableName);

router.get('/', userAuth, getTimeTableDetails);

router.get('/single', userAuth, getSingleTimeTableDetails);

router.patch('/', userAuth, updateTimeTable);

router.delete('/', userAuth, deleteTimeTable);

export default router; 