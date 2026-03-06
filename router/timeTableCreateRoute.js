import { Router } from 'express'
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
const router = Router();
import {
    addtimeTableCreate, gettimeTableCreateDetails, getSingletimeTableCreateDetails, addtimeTableMapping, getTimeTableMappingDetail, getSingletimeTableMappingDetail, getTimeTableCellData
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

router.get('/getRoutine', userAuth, validate({ query: getRoutineSchema }), getRoutineByClassSectionId);

router.get('/getRoutineByTeacher', userAuth, validate({ query: getRoutineByTeacherSchema }), getRoutineByTeacherAndAcademicYear);

router.post('/', userAuth, addtimeTableCreate);

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