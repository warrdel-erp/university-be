import {Router} from  'express'
const router =  Router();
import {addFaculityLoad,getFaculityLoadDetails,getSingleFaculityLoadDetails,updateFaculityLoad,deleteFaculityLoad} from '../controllers/faculityLoadController.js';
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addFaculityLoad);

router.get('/', userAuth, getFaculityLoadDetails);

router.get('/single' ,userAuth, getSingleFaculityLoadDetails);

router.patch('/' ,userAuth, updateFaculityLoad);

router.delete('/' ,userAuth, deleteFaculityLoad);

export default router;