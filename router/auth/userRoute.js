import { Router } from "express";
import rateLimit from 'express-rate-limit'
const router = Router();

import {
    login,
    refreshToken,
    logout,
    logoutAll,
    getActiveSessions,
    revokeSession,
    register,
    adminRegisterStudentAndEmployee,
    getAdminRegisterStudentAndEmployee,
    changePassword,
    changeStatus,
    sendLink,
    forgotPassword,
    forgotChangePassword,
    getAllUsers,
    getMyDetails,
    saveUserDefaults,
    initialSetup,
    getGrantedAccess,
    giveFullAccess
} from "../../controllers/userController.js";
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

const giveFullAccessSchema = z.object({
    userId: z.coerce.number({ required_error: "userId is required" }),
    instituteId: z.coerce.number().optional()
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: {
        message: "Too many attempts. Try again later."
    },
    standardHeaders: "draft-8",
    legacyHeaders: false
});

// Endpoints -------------------------------

// for first time register
router.post('/register', register)

// for initial setup of new client
router.post('/setup', validate({ body: initialSetupSchema }), initialSetup);

// for giving full access to existing user by userId
router.post('/giveFullAccess', validate({ body: giveFullAccessSchema }), giveFullAccess);

// for login
router.post("/login",limiter, login);

// for token refresh (with rotation and reuse detection)
router.post("/refresh-token", refreshToken);

// for logging out current sessio˝n
router.post("/logout", logout);

// for logging out all sessions / devices
router.post("/logout-all", useAuth, logoutAll);

// for viewing active sessions/devices
router.get("/sessions", useAuth, getActiveSessions);

// for revoking a specific session
router.delete("/sessions/:sessionId", useAuth, revokeSession);

//admin sign up to student and employee

router.post("/adminSignUp", adminRegisterStudentAndEmployee);

//get admin sign up to student and employee 

router.get("/adminSignUp", useAuth, getAdminRegisterStudentAndEmployee);

// student or employee change password

router.post("/changePassword", useAuth,limiter, changePassword);

router.patch("/changeStatus", useAuth,limiter, checkAccess(PERMISSIONS.USER_MANAGEMENT_CHANGE_STATUS.value, 'user'), changeStatus);

router.patch("/sendLink", useAuth,limiter, checkAccess(PERMISSIONS.USER_MANAGEMENT_RESET_PASSWORD.value, 'user'), sendLink);

// forgot 

router.post("/forgotPassword",limiter,limiter, forgotPassword);

router.patch("/forgotPassword", useAuth,limiter, forgotChangePassword);

router.get("/", useAuth, checkAccess(PERMISSIONS.USER_MANAGEMENT.value, 'user'), validate({ query: getAllUsersSchema }), getAllUsers);

router.get("/myDetails", useAuth, getMyDetails);

router.get("/grantedAccess", useAuth, getGrantedAccess);

router.put("/saveUserDefaults", useAuth, validate({ body: saveUserDefaultsSchema }), saveUserDefaults);

export default router;