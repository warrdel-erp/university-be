import {Router} from  'express';
const router =  Router();

import {getAllEmployeeType,addEmployeeCode,getEmployeeCodesTypes,updateCodeMasterType,deleteCodeMasterType} from '../controllers/codeMasterController.js';
import userAuth  from '../middleware/authUser.js'

router.get('/',userAuth, getAllEmployeeType);

router.post('/addCode',userAuth, addEmployeeCode);

router.get('/getCodesTypes',userAuth, getEmployeeCodesTypes);

router.patch('/:employeeCodeMasterTypeId',userAuth, updateCodeMasterType);

router.delete('/:employeeCodeMasterTypeId',userAuth, deleteCodeMasterType);

export default router;