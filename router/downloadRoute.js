import {Router} from  'express'
const router =  Router();

import {downloadFile } from "../controllers/downloadController.js";
import userAuth from "../middleware/authUser.js"

router.get('/',userAuth , downloadFile);

export default router;