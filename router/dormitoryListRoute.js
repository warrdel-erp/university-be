import {Router} from  'express'
const router =  Router();
import {addDormitoryList,getAllDormitoryList,getSingleDormitoryListDetails,updateDormitoryList,deleteDormitoryList} from "../controllers/dormitoryListController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addDormitoryList);

router.get('/', userAuth, getAllDormitoryList);

router.get('/single' ,userAuth, getSingleDormitoryListDetails);

router.patch('/' ,userAuth, updateDormitoryList);

router.delete('/' ,userAuth, deleteDormitoryList);

export default router;