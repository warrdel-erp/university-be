import {Router} from  'express'

const router =  Router();

import { getAllSelectBoxData} from "../controllers/settingController.js"

import userAuth from '../middleware/authUser.js';

router.get(`/all`, userAuth ,getAllSelectBoxData)

export default router;