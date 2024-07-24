import {downloadFile } from "../controllers/downloadController.js"

// router
import {Router} from  'express'
const router =  Router();

router.get('/', downloadFile);

export default router;