import {Router} from  'express'
const router =  Router();
import {addFeeInvoiceDetails,getAllFeeInvoiceDetails,getSingleFeeInvoiceDetails,updateFeeInvoiceDetails,deleteFeeInvoiceDetails} from "../controllers/feeInvoiceDetailController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addFeeInvoiceDetails);

router.get('/', userAuth, getAllFeeInvoiceDetails);

router.get('/single' ,userAuth, getSingleFeeInvoiceDetails);

router.patch('/' ,userAuth, updateFeeInvoiceDetails);

router.delete('/' ,userAuth, deleteFeeInvoiceDetails);

export default router;