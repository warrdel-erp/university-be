import {Router} from  'express'
const router =  Router();
import {addCo,
    getAllCo,getSingleCoDetails,updateCo,deleteCo,addCoWeightage,getAllCoWeightage,getSingleCoDetailsWeightage,updateCoWeightage
} from "../controllers/coController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addCo);

router.get('/', userAuth, getAllCo);

router.get('/single' ,userAuth, getSingleCoDetails);

router.patch('/' ,userAuth, updateCo);

router.delete('/' ,userAuth, deleteCo);

router.post('/weightage', userAuth, addCoWeightage);

router.get('/weightage', userAuth, getAllCoWeightage);

router.get('/single/weightage' ,userAuth, getSingleCoDetailsWeightage);

router.patch('/weightage' ,userAuth, updateCoWeightage);

export default router;