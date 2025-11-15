import {Router} from  'express'
const router =  Router();
import {getStudentCount
    ,activeInvoice
    ,getAllActiveInvoice,addStudentSpecificInvoice
    // ,updateFeePlan,deleteFeePlan
} from "../controllers/studentInvoiceController.js";
import userAuth from "../middleware/authUser.js"

router.get('/count', userAuth, getStudentCount);

router.post('/', userAuth, activeInvoice);

router.post('/studentInvoice', userAuth, addStudentSpecificInvoice);

router.get('/' ,userAuth, getAllActiveInvoice);

// router.patch('/' ,userAuth, updateFeePlan);

// router.delete('/' ,userAuth, deleteFeePlan);

export default router;