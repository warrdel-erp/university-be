import {Router} from  'express'
const router =  Router();
import {addLibrary,getLibraryDetails,getSingleLibraryDetails,updateLibray,deleteLibray} from "../controllers/libraryCreationController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addLibrary);

router.get('/', userAuth, getLibraryDetails);

router.get('/single' ,userAuth, getSingleLibraryDetails);

router.patch('/' ,userAuth, updateLibray);

router.delete('/' ,userAuth, deleteLibray);

export default router;