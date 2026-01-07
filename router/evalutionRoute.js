import {Router} from  'express'
const router =  Router();
import {addEvaluation,getAllEvaluation,getSingleEvaluationDetails,updateEvaluation,deleteEvaluation} from "../controllers/evalutionController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addEvaluation);

router.get('/', userAuth, getAllEvaluation);

router.get('/single' ,userAuth, getSingleEvaluationDetails);

router.patch('/' ,userAuth, updateEvaluation);

router.delete('/' ,userAuth, deleteEvaluation);

export default router;