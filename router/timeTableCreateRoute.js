import {Router} from  'express'
const router =  Router();
import {addtimeTableCreate,gettimeTableCreateDetails,getSingletimeTableCreateDetails,addtimeTableMapping,getTimeTableMappingDetail,getSingletimeTableMappingDetail
    // updatetimeTableCreate,deletetimeTableCreate
} from '../controllers/timeTableCreateController.js';
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addtimeTableCreate);

router.get('/', userAuth, gettimeTableCreateDetails);

router.get('/single' ,userAuth, getSingletimeTableCreateDetails);

// router.patch('/' ,userAuth, updatetimeTableCreate);

// router.delete('/' ,userAuth, deletetimeTableCreate);

router.post('/mapping', userAuth, addtimeTableMapping);

router.get('/mapping', userAuth, getTimeTableMappingDetail);

router.get('/single/mapping' ,userAuth, getSingletimeTableMappingDetail);

// router.patch('/mapping' ,userAuth, updatetimeTableCreate);

// router.delete('/mapping' ,userAuth, deletetimeTableCreate);

export default router;