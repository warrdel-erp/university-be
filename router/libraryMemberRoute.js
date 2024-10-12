import {Router} from  'express'
const router =  Router();
import {addMember,getMemberDetails,getSingleMemberDetails,updateMember,deleteMember ,bookIssue,getAllIssueBooks,getBookByMemberId,updateBookAndStatus,deleteBook} from "../controllers/libraryMemberController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addMember);

router.get('/', userAuth, getMemberDetails);

router.get('/single' ,userAuth, getSingleMemberDetails);

router.patch('/' ,userAuth, updateMember);

router.delete('/' ,userAuth, deleteMember);

//Book Issue

router.post('/bookIssue', userAuth, bookIssue);

router.get('/getAllIssueBook', userAuth, getAllIssueBooks);

router.get('/memberBook' ,userAuth, getBookByMemberId);

router.patch('/updateStatusBook' ,userAuth, updateBookAndStatus);

router.delete('/deleteBook' ,userAuth, deleteBook);

export default router;