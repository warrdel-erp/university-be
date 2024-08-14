import {Router} from  'express';
const router =  Router();

import {getAllEmployeeType,addEmployeeCode,getEmployeeCodesTypes,updateCodeMasterType,deleteCodeMasterType} from '../controllers/codeMasterController.js';

router.get('/', getAllEmployeeType);

router.post('/addCode', addEmployeeCode);

router.get('/getCodesTypes', getEmployeeCodesTypes);

router.patch('/:employeeCodeMasterTypeId', updateCodeMasterType);

router.delete('/:employeeCodeMasterTypeId', deleteCodeMasterType);

export default router;