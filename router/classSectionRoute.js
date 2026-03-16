import { Router } from 'express';
const router = Router();
import { getClassSectionsByFilter } from '../controllers/mainController.js';
import userAuth from '../middleware/authUser.js';

router.get('/', userAuth, getClassSectionsByFilter);

export default router;
