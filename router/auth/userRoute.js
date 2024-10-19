import { Router } from "express";
const router = Router();

import { login ,register,adminRegisterStudentAndEmployee,getAdminRegisterStudentAndEmployee,changePassword} from "../../controllers/userController.js";


// for first time register
router.post('/register',register)

// for login
router.post("/login", login);

//admin sign up to student and employee

router.post("/adminSignUp", adminRegisterStudentAndEmployee);

//get admin sign up to student and employee 

router.get("/adminSignUp", getAdminRegisterStudentAndEmployee);

// student or employee change password

router.post("/changePassword", changePassword);

export default router;