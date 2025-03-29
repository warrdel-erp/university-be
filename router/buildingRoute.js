import {Router} from  'express'
const router =  Router();
import {addbuilding,getAllbuilding,getSinglebuildingDetails,updatebuilding,deletebuilding} from "../controllers/buildingController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addbuilding);

router.get('/', userAuth, getAllbuilding);

router.get('/single' ,userAuth, getSinglebuildingDetails);

router.patch('/' ,userAuth, updatebuilding);

router.delete('/' ,userAuth, deletebuilding);

export default router;