import {Router} from  'express'
const router =  Router();
import {addtimeTableCreate,gettimeTableCreateDetails,getSingletimeTableCreateDetails,
    // updatetimeTableCreate,deletetimeTableCreate
} from '../controllers/timeTableCreateController.js';
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addtimeTableCreate);

router.get('/', userAuth, gettimeTableCreateDetails);

router.get('/single' ,userAuth, getSingletimeTableCreateDetails);

// router.patch('/' ,userAuth, updatetimeTableCreate);

// router.delete('/' ,userAuth, deletetimeTableCreate);

export default router;