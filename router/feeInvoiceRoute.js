import {Router} from  'express'
const router =  Router();
import {addFeeInvoice,getAllFeeInvoice,getSingleFeeInvoiceDetails,updateFeeInvoice,deleteFeeInvoice,getInvoiceNumber} from "../controllers/feeInvoiceController.js";
import userAuth from "../middleware/authUser.js"
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.FEES_INVOICE_ADD.value, null), addFeeInvoice);

router.get('/', userAuth, checkAccess(PERMISSIONS.FEES_INVOICE.value, null), getAllFeeInvoice);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.FEES_INVOICE.value, null), getSingleFeeInvoiceDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.FEES_INVOICE_EDIT.value, null), updateFeeInvoice);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.FEES_INVOICE_DELETE.value, null), deleteFeeInvoice);

router.get('/getInvoiceNumber', userAuth, checkAccess(PERMISSIONS.FEES_INVOICE.value, null), getInvoiceNumber);

export default router;