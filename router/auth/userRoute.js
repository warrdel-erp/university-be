import { Router } from "express";
const router = Router();

import { login, register, adminRegisterStudentAndEmployee, getAdminRegisterStudentAndEmployee, changePassword, changeStatus, sendLink, forgotPassword, forgotChangePassword, getAllUsers } from "../../controllers/userController.js";
import useAuth from "../../middleware/authUser.js";
import { z } from "zod";
import { validate } from "../../utility/validation.js";

const getAllUsersSchema = z.object({
    instituteId: z.coerce.number(),
    page: z.coerce.number(),
    limit: z.coerce.number(),
    search: z.string().optional()
});

// Endpoints -------------------------------

// for first time register
router.post('/register', register)

// for login
router.post("/login", login);

//admin sign up to student and employee

router.post("/adminSignUp", adminRegisterStudentAndEmployee);

//get admin sign up to student and employee 

router.get("/adminSignUp", useAuth, getAdminRegisterStudentAndEmployee);

// student or employee change password

router.post("/changePassword", changePassword);

router.patch("/changeStatus", changeStatus);

router.patch("/sendLink", sendLink);

// forgot 

router.post("/forgotPassword", forgotPassword);

router.patch("/forgotPassword", useAuth, forgotChangePassword);

router.get("/", useAuth, validate({ query: getAllUsersSchema }), getAllUsers);

export default router;