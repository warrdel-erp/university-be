import { Router } from "express";
const router = Router();

import { login, register, adminRegisterStudentAndEmployee, getAdminRegisterStudentAndEmployee, changePassword, changeStatus, sendLink, forgotPassword, forgotChangePassword, getAllUsers, getMyDetails, saveUserDefaults } from "../../controllers/userController.js";
import useAuth from "../../middleware/authUser.js";
import { z } from "zod";
import { validate } from "../../utility/validation.js";

const getAllUsersSchema = z.object({
    instituteId: z.coerce.number(),
    page: z.coerce.number(),
    limit: z.coerce.number(),
    search: z.string().optional()
});

const saveUserDefaultsSchema = z.object({
    defaultInstituteId: z.number({
        required_error: "defaultInstituteId is required"
    }),
    defaultRole: z.string({
        required_error: "defaultRole is required"
    }).min(1, "defaultRole cannot be empty"),
    defaultAcademicYearId: z.number({
        required_error: "defaultAcademicYearId is required"
    })
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

router.get("/myDetails", useAuth, getMyDetails);

router.put("/saveUserDefaults", useAuth, validate({ body: saveUserDefaultsSchema }), saveUserDefaults);

export default router;