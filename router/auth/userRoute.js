import { Router } from "express";
const router = Router();

import { login, register, adminRegisterStudentAndEmployee, getAdminRegisterStudentAndEmployee, changePassword, changeStatus, sendLink, forgotPassword, forgotChangePassword, getAllUsers, getMyDetails, saveUserDefaults, initialSetup } from "../../controllers/userController.js";
import useAuth from "../../middleware/authUser.js";
import { z } from "zod";
import { validate } from "../../utility/validation.js";
import { checkAccess } from "../../middleware/checkAccess.js";
import { PERMISSIONS } from "../../const/permissions.js";

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

const initialSetupSchema = z.object({
    universityName: z.string().optional(),
    campusName: z.string().optional(),
    campusCode: z.string().optional(),
    instituteName: z.string().optional(),
    instituteCode: z.string().optional(),
    userName: z.string().optional(),
    email: z.string({ required_error: "email is required" }).email("Invalid email format"),
    password: z.string({ required_error: "password is required" }).min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
    yearTitle: z.string().optional(),
    startingDate: z.string().optional(),
    endingDate: z.string().optional()
});

// Endpoints -------------------------------

// for first time register
router.post('/register', register)

// for initial setup of new client
router.post('/setup', validate({ body: initialSetupSchema }), initialSetup);

// for login
router.post("/login", login);

//admin sign up to student and employee

router.post("/adminSignUp", adminRegisterStudentAndEmployee);

//get admin sign up to student and employee 

router.get("/adminSignUp", useAuth, getAdminRegisterStudentAndEmployee);

// student or employee change password

router.post("/changePassword", changePassword);

router.patch("/changeStatus", useAuth, checkAccess(PERMISSIONS.USER_MANAGEMENT_CHANGE_STATUS.value, 'user'), changeStatus);

router.patch("/sendLink", useAuth, checkAccess(PERMISSIONS.USER_MANAGEMENT_RESET_PASSWORD.value, 'user'), sendLink);

// forgot 

router.post("/forgotPassword", forgotPassword);

router.patch("/forgotPassword", useAuth, forgotChangePassword);

router.get("/", useAuth, checkAccess(PERMISSIONS.USER_MANAGEMENT.value, 'user'), validate({ query: getAllUsersSchema }), getAllUsers);

router.get("/myDetails", useAuth, getMyDetails);

router.put("/saveUserDefaults", useAuth, validate({ body: saveUserDefaultsSchema }), saveUserDefaults);

export default router;