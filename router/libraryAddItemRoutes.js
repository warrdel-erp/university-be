import {Router} from  'express'
const router =  Router();
import {addLibraryItem,getLibraryItemDetails,getSingleLibraryItemDetails,updateLibrayItem,deleteLibrayItem} from "../controllers/libraryAddItemontroller.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addLibraryItem);

router.get('/', userAuth, getLibraryItemDetails);

router.get('/single' ,userAuth, getSingleLibraryItemDetails);

router.patch('/' ,userAuth, updateLibrayItem);

router.delete('/' ,userAuth, deleteLibrayItem);

export default router;