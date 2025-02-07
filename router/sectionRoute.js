import {Router} from  'express'
const router =  Router();
import {addSection,getAllSection,getSingleSectionDetails,updateSection,deleteSection} from "../controllers/sectionController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addSection);

router.get('/', userAuth, getAllSection);

router.get('/single' ,userAuth, getSingleSectionDetails);

router.patch('/' ,userAuth, updateSection);

router.delete('/' ,userAuth, deleteSection);

export default router;