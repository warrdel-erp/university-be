import {Router} from  'express'
const router =  Router();
import {addFeeInvoice,getAllFeeInvoice,getSingleFeeInvoiceDetails,updateFeeInvoice,deleteFeeInvoice} from "../controllers/feeInvoiceController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addFeeInvoice);

router.get('/', userAuth, getAllFeeInvoice);

router.get('/single' ,userAuth, getSingleFeeInvoiceDetails);

router.patch('/' ,userAuth, updateFeeInvoice);

router.delete('/' ,userAuth, deleteFeeInvoice);

export default router;