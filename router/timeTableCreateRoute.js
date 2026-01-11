import {Router} from  'express'
const router =  Router();
import {addtimeTableCreate,gettimeTableCreateDetails,getSingletimeTableCreateDetails,addtimeTableMapping,getTimeTableMappingDetail,getSingletimeTableMappingDetail,getTimeTableCellData
   ,updatetimeTableCreate,getTimeTableElective,publishTimeTable,updateSimpleTeacherMappingController
    ,deletetimeTableMapping,ClassSubjectCount,changeTimeTableCreate,getTimeTableByCourseAndSection
} from '../controllers/timeTableCreateController.js';
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addtimeTableCreate);

router.get('/', userAuth, gettimeTableCreateDetails);

router.get('/single' ,userAuth, getSingletimeTableCreateDetails);

router.get('/create' ,userAuth, getTimeTableByCourseAndSection);

router.patch('/create' ,userAuth, changeTimeTableCreate);

// router.delete('/' ,userAuth, deletetimeTableCreate);

router.post('/mapping', userAuth, addtimeTableMapping);

router.get('/mapping', userAuth, getTimeTableMappingDetail);

router.get('/single/mapping' ,userAuth, getSingletimeTableMappingDetail);

router.patch('/mapping' ,userAuth, updatetimeTableCreate);

router.patch('/mapping/update-create', userAuth, updateSimpleTeacherMappingController);

router.delete('/mapping' ,userAuth, deletetimeTableMapping);

router.get('/cellData', userAuth, getTimeTableCellData);

router.get('/elective', userAuth, getTimeTableElective);

router.patch("/publish", userAuth, publishTimeTable);

router.get("/subjectCount", userAuth, ClassSubjectCount);

export default router;