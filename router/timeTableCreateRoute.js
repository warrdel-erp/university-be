import { Router } from 'express'
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
const router = Router();
import {
    addtimeTableCreate, cloneTimeTableRoutine, gettimeTableCreateDetails, getSingletimeTableCreateDetails, addtimeTableMapping, getTimeTableMappingDetail, getSingletimeTableMappingDetail, getTimeTableCellData
    , updatetimeTableCreate, getTimeTableElective, publishTimeTable, updateSimpleTeacherMappingController
    , deletetimeTableMapping, ClassSubjectCount, changeTimeTableCreate, getTimeTableByCourseAndSection, getRoutineByClassSectionId, getRoutineByTeacherAndAcademicYear
} from '../controllers/timeTableCreateController.js';

const getRoutineSchema = z.object({
    classSectionsId: z.string().regex(/^\d+$/, "classSectionsId must be a number").transform(val => parseInt(val))
});

const getRoutineByTeacherSchema = z.object({
    employeeId: z.string().regex(/^\d+$/, "employeeId must be a number").transform(val => parseInt(val)),
    acedmicYearId: z.string().regex(/^\d+$/, "acedmicYearId must be a number").optional().transform(val => val ? parseInt(val) : undefined)
});

const cloneRoutineSchema = z.object({
    previousRoutineId: z.number({ required_error: "previousRoutineId is required" }),
    startingDate: z.string({ required_error: "startingDate is required" }),
    endingDate: z.string({ required_error: "endingDate is required" })
}).refine((data) => new Date(data.endingDate) >= new Date(data.startingDate), {
    message: "endingDate cannot be before startingDate",
    path: ["endingDate"]
});

router.get('/getRoutine', userAuth, validate({ query: getRoutineSchema }), getRoutineByClassSectionId);

router.get('/getRoutineByTeacher', userAuth, validate({ query: getRoutineByTeacherSchema }), getRoutineByTeacherAndAcademicYear);

router.post('/', userAuth, addtimeTableCreate);

router.post('/clone', userAuth, validate({ body: cloneRoutineSchema }), cloneTimeTableRoutine);

router.get('/', userAuth, gettimeTableCreateDetails);

router.get('/single', userAuth, getSingletimeTableCreateDetails);

router.get('/create', userAuth, getTimeTableByCourseAndSection);

router.patch('/create', userAuth, changeTimeTableCreate);

// router.delete('/' ,userAuth, deletetimeTableCreate);

router.post('/mapping', userAuth, addtimeTableMapping);

router.get('/mapping', userAuth, getTimeTableMappingDetail);

router.get('/single/mapping', userAuth, getSingletimeTableMappingDetail);

router.patch('/mapping', userAuth, updatetimeTableCreate);

router.patch('/mapping/update-create', userAuth, updateSimpleTeacherMappingController);

router.delete('/mapping', userAuth, deletetimeTableMapping);

router.get('/cellData', userAuth, getTimeTableCellData);

router.get('/elective', userAuth, getTimeTableElective);

router.patch("/publish", userAuth, publishTimeTable);

router.get("/subjectCount", userAuth, ClassSubjectCount);

export default router; 