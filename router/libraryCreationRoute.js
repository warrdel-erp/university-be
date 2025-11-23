import {Router} from  'express'
const router =  Router();
import {addLibrary,getLibraryDetails,getSingleLibraryDetails,updateLibray,deleteLibray,addBookWithInventory,getAllBooks,getSingleBookDetails,updateBook,updateInventory,deleteBook,deleteInventoryCopy,getAllIssuedBooks,bulkUploadBooks} from "../controllers/libraryCreationController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addLibrary);

router.get('/', userAuth, getLibraryDetails);

router.get('/single' ,userAuth, getSingleLibraryDetails);

router.patch('/' ,userAuth, updateLibray);

router.delete('/' ,userAuth, deleteLibray);

router.post("/addBook", userAuth, addBookWithInventory);

router.get("/allBook", userAuth, getAllBooks);

router.get("/singleBook", userAuth, getSingleBookDetails);

router.patch("/updateBook", userAuth, updateBook);

router.patch("/updateInventory", userAuth, updateInventory);

router.delete("/deleteBook", userAuth, deleteBook);

router.delete("/deleteInventory", userAuth, deleteInventoryCopy);

router.get("/issuedBook", userAuth, getAllIssuedBooks);

router.post("/bulkUpload", userAuth, bulkUploadBooks);

export default router;