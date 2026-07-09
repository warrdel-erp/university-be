import { Router } from 'express'
const router = Router();
import { addStaff, getAllStaff, getSingleStaffDetails, updateStaff, deleteStaff } from "../controllers/staffController.js";
import userAuth from "../middleware/authUser.js"
import { checkAccess, checkAccessAny } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccessAny([PERMISSIONS.HR_MASTER.value, PERMISSIONS.STAFF_DIRECTORY_ADD.value], null), addStaff);

router.get('/', userAuth, checkAccessAny([PERMISSIONS.HR_MASTER.value, PERMISSIONS.STAFF_DIRECTORY.value], null), getAllStaff);

router.get('/single', userAuth, checkAccessAny([PERMISSIONS.HR_MASTER.value, PERMISSIONS.STAFF_DIRECTORY.value], null), getSingleStaffDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY_EDIT.value, null), updateStaff);

router.delete('/', userAuth, checkAccess(PERMISSIONS.STAFF_DIRECTORY_DELETE.value, null), deleteStaff);

export default router;