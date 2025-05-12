import * as mainServices  from '../services/mainServices.js';
import * as fileHandler from '../utility/fileHandler.js';

export const getAllCollegesAndCourses = async (req,res) => {
    const universityId = req.user.universityId;
    try {
        const campusId = req.query.campusId;
        const instituteId = req.query.instituteId;
        const acedmicYearId = req.query.acedmicYearId;
        if(!universityId){
            res.status(400).send('University Id is required')
        }
        const result = await mainServices.getAllCollegesAndCourses(universityId,campusId,instituteId,acedmicYearId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all course:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addCampus = async (req,res) => {
    try {
        const {universityId} = req.body;        
        const createdBy = req.user.userId;
        const data = req.body
        if(!universityId){
            res.status(400).send('University Id is required')
        }
        // else if(req){
        //     res.status(400).send('For Add Campus Contact TO Warrdel Team')
        // }
        const result = await mainServices.addCampus(data,createdBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in Add Campus:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addInstitute = async (req,res) => {
    try {
        const {universityId,campusId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if(!(universityId && campusId)){
            res.status(400).send('University Id and Campus Id is required')
        }
        // else if(req){
        //     res.status(400).send('For Add Institute Contact TO Warrdel Team')
        // } 
        const result = await mainServices.addInstitute(data,createdBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Institute:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addAffiliatedUniversity = async (req,res) => {
    try {
        const {universityId,instituteId} = req.body;
        const createdBy = req.user.userId;
        const data =  req.body
        if(!(universityId && instituteId)){
            res.status(400).send('University Id and institute Id is required')
        }
        const result = await mainServices.addAffiliatedUniversity(data,createdBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Affiliated University:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addCourse = async (req,res) => {
    try {
        const {universityId,course_levelId,affiliatedUniversityId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if(!(universityId && course_levelId && affiliatedUniversityId)){
            res.status(400).send('University Id,affiliatedUniversityId and course_level Id is required')
        } 
        const result = await mainServices.addCourse(data,createdBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Course:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addSpecialization = async (req,res) => {
    try {
        const {universityId,course_Id,acedmicYearId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if(!(universityId && course_Id && acedmicYearId)){
            res.status(400).send('University Id, course Id and acedmicYearId is required')
        } 
        const result = await mainServices.addSpecialization(data,createdBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Specialization:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addSubject = async (req,res) => {
    try {
        const {courseId,universityId,acedmicYearId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if(!(courseId && universityId && acedmicYearId)){
            res.status(400).send('universityId , course Id and acedmicYearId is required')
        } 
        const result = await mainServices.addSubject(data,createdBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add SUbject:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addClass = async (req,res) => {
    try {
        const {courseId,specializationId} = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const data = req.body
        if(!(courseId || specializationId)){
            res.status(400).send('specializationId Or course Id is required')
        } 
        const result = await mainServices.addClass(data,createdBy,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Class:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getClass = async (req,res) => {
    try {
        const classSectionIds = req.query.classSectionId;
        const classSectionId = classSectionIds || 0;
        const universityId = req.user.universityId;
        const result = await mainServices.getClassDetails(classSectionId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addClassSubjectMapper = async (req,res) => {
    try {
        const {classId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if(!(classId)){
            return res.status(400).send('classId is required')
        } 
        const result = await mainServices.addClassSubjectMapper(data,createdBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Class Subject Mapper:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getClassSubjectMapper = async (req,res) => {
    try {
        const classSectionId = req.query.classSectionId  || 0;
        const universityId = req.user.universityId;
        const result = await mainServices.getClassSubjectMapper(classSectionId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addSemester = async (req,res) => {
    try {
        const {courseId,acedmicYearId} = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const data = req.body
        if(!(universityId && courseId && acedmicYearId)){
            res.status(400).send('universityId and courseId is required')
        } 
        const result = await mainServices.addSemester(data,createdBy,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add semester:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSemester = async (req,res) => {
    try {
        const courseId = req.query.courseId  || 0;
        const acedmicYearId = req.query.acedmicYearId
        const specializationId = req.query.specializationId;
        const universityId = req.user.universityId;
        const result = await mainServices.getSemester(courseId,specializationId,universityId,acedmicYearId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting semester:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const createClass = async (req,res) => {
    try {
        const {acedmicYearId,courseId} = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const data = req.body
        if(!(acedmicYearId && courseId)){
            res.status(400).send('acedmicYearId and courseId is required')
        } 
        const result = await mainServices.createClass(data,createdBy,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add directly class:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const subjectExcel = async (req,res) => {
    try {
        const {courseId,specializationId} = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const data = req.body
        if(!(courseId)){
            res.status(400).send('courseId is required')
        } 
        const excelFile = req.files?.subject;
        if (!excelFile) {
            return res.status(400).send('Excel file is required');
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        const result = await mainServices.subjectExcel(excelData,courseId,specializationId,createdBy,universityId);

        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Subject Excel:", error);
        res.status(500).send("Internal Server Error");
    }
};