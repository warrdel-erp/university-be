import {Router} from  'express'
const router =  Router();
import {addFeeInvoiceDetailRecord,getAllFeeInvoiceDetailRecord,getSingleFeeInvoiceDetailRecord,updateFeeInvoiceDetailRecord,deleteFeeInvoiceDetailRecord} from "../controllers/feeInvoiceDetailRecordController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addFeeInvoiceDetailRecord);

router.get('/', userAuth, getAllFeeInvoiceDetailRecord);

router.get('/single' ,userAuth, getSingleFeeInvoiceDetailRecord);

router.patch('/' ,userAuth, updateFeeInvoiceDetailRecord);

router.delete('/' ,userAuth, deleteFeeInvoiceDetailRecord);

export default router;