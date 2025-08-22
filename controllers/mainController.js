import * as mainServices  from '../services/mainServices.js';
import * as fileHandler from '../utility/fileHandler.js';

export const getAllCollegesAndCourses = async (req,res) => {
    const universityId = req.user.universityId;
    const role = req.user.role;    
    const headInstituteId = req.user.instituteId;
    
    try {
        const campusId = req.query.campusId;
        const instituteId = req.query.instituteId;
        const acedmicYearId = req.query.acedmicYearId;
        if(!universityId){
            return res.status(400).send('University Id is required')
        }
        const result = await mainServices.getAllCollegesAndCourses(universityId,campusId,instituteId,acedmicYearId,role,headInstituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all course:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addCampus = async (req,res) => {
    try {
        const {universityId} = req.body;        
        const createdBy = req.user.userId;
        const data = req.body
        if(!universityId){
           return res.status(400).send('University Id is required')
        }
        const result = await mainServices.addCampus(data,createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in Add Campus:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addInstitute = async (req,res) => {
    try {
        const {universityId,campusId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if(!(universityId && campusId)){
          return res.status(400).send('University Id and Campus Id is required')
        }
        const result = await mainServices.addInstitute(data,createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Institute:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addAffiliatedUniversity = async (req,res) => {
    try {
        const {universityId,instituteId} = req.body;
        const createdBy = req.user.userId;
        const data =  req.body
        if(!(universityId && instituteId)){
           return res.status(400).send('University Id and institute Id is required')
        }
        const result = await mainServices.addAffiliatedUniversity(data,createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Affiliated University:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addCourse = async (req,res) => {
    try {
        const {universityId,course_levelId,affiliatedUniversityId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body;
        const instituteId = req.user.instituteId;
        if(!(universityId && course_levelId && affiliatedUniversityId && instituteId)){
            return res.status(400).send('University Id,instituteId,affiliatedUniversityId and course_level Id is required')
        } 
        const result = await mainServices.addCourse(data,createdBy,instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Course:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addSpecialization = async (req,res) => {
    try {
        const {universityId,course_Id,acedmicYearId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        const instituteId = req.user.instituteId;
        if(!(universityId && course_Id && acedmicYearId && instituteId)){
            return res.status(400).send('University Id,instituteId, course Id and acedmicYearId is required')
        } 
        const result = await mainServices.addSpecialization(data,createdBy,instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Specialization:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addSubject = async (req,res) => {
    try {
        const {courseId,universityId,acedmicYearId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        const instituteId = req.user.instituteId;
        if(!(courseId && universityId && acedmicYearId && instituteId)){
            return res.status(400).send('universityId ,instituteId, course Id and acedmicYearId is required')
        } 
        const result = await mainServices.addSubject(data,createdBy,instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add SUbject:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addClass = async (req,res) => {
    try {
        const {courseId,specializationId} = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const instituteId = req.user.instituteId;
        const data = req.body
        if(!(courseId || specializationId)){
            return res.status(400).send('specializationId Or course Id is required')
        } 
        const result = await mainServices.addClass(data,createdBy,universityId,instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Class:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getClass = async (req,res) => {
    try {
        const classSectionIds = req.query.classSectionId;
        const acedmicYearId = req.query.acedmicYearId
        const classSectionId = classSectionIds || 0;
        const universityId = req.user.universityId;
        const role = req.user.role;    
        const instituteId = req.user.instituteId;
        const result = await mainServices.getClassDetails(classSectionId,universityId,acedmicYearId,instituteId,role);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addClassSubjectMapper = async (req,res) => {
    try {
        // const {classId} = req.body;
        const {semesterId} = req.body
        const createdBy = req.user.userId;
        const data = req.body;
        const instituteId = req.user.instituteId;
        if(!(semesterId && instituteId)){
            return res.status(400).send('semesterId and instituteId is required')
        } 
        const result = await mainServices.addClassSubjectMapper(data,createdBy,instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add semester Subject Mapper:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getClassSubjectMapper = async (req,res) => {
    try {
        const semesterId = req.query.semesterId  || 0;
        const acedmicYearId = req.query.acedmicYearId 
        const universityId = req.user.universityId;
        const role = req.user.role;    
        const instituteId = req.user.instituteId;
        const result = await mainServices.getClassSubjectMapper(semesterId,universityId,acedmicYearId,instituteId,role);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addSemester = async (req,res) => {
    try {
        const {courseId,acedmicYearId} = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const data = req.body
        const instituteId = req.user.instituteId;
        if(!(universityId && courseId && acedmicYearId && instituteId)){
            return res.status(400).send('universityId,instituteId,acedmicYearId and courseId is required')
        } 
        const result = await mainServices.addSemester(data,createdBy,universityId,instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add semester:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getSemester = async (req,res) => {
    try {
        const courseId = req.query.courseId  || 0;
        const acedmicYearId = req.query.acedmicYearId
        const specializationId = req.query.specializationId;
        const universityId = req.user.universityId;
        const role = req.user.role;    
        const instituteId = req.user.instituteId;
        const result = await mainServices.getSemester(courseId,specializationId,universityId,acedmicYearId,instituteId,role);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting semester:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const createClass = async (req,res) => {
    try {
        const {acedmicYearId,courseId} = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const data = req.body
        const instituteId = req.user.instituteId;
        if(!(acedmicYearId && courseId && instituteId)){
            return res.status(400).send('acedmicYearId ,instituteId and courseId is required')
        } 
        const result = await mainServices.createClass(data,createdBy,universityId,instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add directly class:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const subjectExcel = async (req,res) => {
    try {
        const {courseId,specializationId,acedmicYearId} = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const data = req.body;
        const instituteId = req.user.instituteId;
        if(!(courseId && instituteId && acedmicYearId)){
           return res.status(400).send('acedmicYearId, courseId and instituteId is required')
        } 
        const excelFile = req.files?.subject;
        if (!excelFile) {
            return res.status(400).send('Excel file is required');
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        const result = await mainServices.subjectExcel(excelData,courseId,acedmicYearId,specializationId,createdBy,universityId,instituteId);

        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Subject Excel:", error);
        res.status(500).send("Internal Server Error");
    }
};