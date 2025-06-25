import {Router} from  'express'
const router =  Router();
import {addFeeInvoice,getAllFeeInvoice,getSingleFeeInvoiceDetails,updateFeeInvoice,deleteFeeInvoice,getInvoiceNumber} from "../controllers/feeInvoiceController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addFeeInvoice);

router.get('/', userAuth, getAllFeeInvoice);

router.get('/single' ,userAuth, getSingleFeeInvoiceDetails);

router.patch('/' ,userAuth, updateFeeInvoice);

router.delete('/' ,userAuth, deleteFeeInvoice);

router.get('/getInvoiceNumber', userAuth, getInvoiceNumber);

export default router;