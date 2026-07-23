import {Router} from  'express'
const router =  Router();
import {addFaculityLoad,getFaculityLoadDetails,getSingleFaculityLoadDetails,updateFaculityLoad,deleteFaculityLoad} from '../controllers/faculityLoadController.js';
import userAuth from "../middleware/authUser.js"

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.FACULTY_LOAD_ADD.value, null), addFaculityLoad);

router.get('/', userAuth, checkAccess(PERMISSIONS.FACULTY_LOAD.value, null), getFaculityLoadDetails);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.FACULTY_LOAD.value, null), getSingleFaculityLoadDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.FACULTY_LOAD_EDIT.value, null), updateFaculityLoad);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.FACULTY_LOAD_DELETE.value, null), deleteFaculityLoad);

export default router;