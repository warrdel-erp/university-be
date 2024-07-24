import {Router} from  'express'

const router =  Router();

import { getAllSelectBoxData} from "../controllers/settingController.js"

router.get(`/all`, getAllSelectBoxData)

export default router;