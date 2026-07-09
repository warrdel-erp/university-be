import { Router } from 'express'
const router = Router();
import { addStaff, getAllStaff, getSingleStaffDetails, updateStaff, deleteStaff } from "../controllers/staffController.js";
import userAuth from "../middleware/authUser.js"
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.HR_MASTER_ADD.value, null), addStaff);

router.get('/', userAuth, checkAccess(PERMISSIONS.HR_MASTER.value, null), getAllStaff);

router.get('/single', userAuth, checkAccess(PERMISSIONS.HR_MASTER.value, null), getSingleStaffDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.HR_MASTER_EDIT.value, null), updateStaff);

router.delete('/', userAuth, checkAccess(PERMISSIONS.HR_MASTER_DELETE.value, null), deleteStaff);

export default router;