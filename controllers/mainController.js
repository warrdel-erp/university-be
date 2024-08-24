import * as mainServices  from '../services/mainServices.js';

export const getAllCollegesAndCourses = async (req,res) => {
    try {
        const universityId = req.query.universityId;
        if(!universityId){
            res.status(400).send('University Id is required')
        }
        const result = await mainServices.getAllCollegesAndCourses(universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all course:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addCampus = async (req,res) => {
    try {
        const {universityId} = req.body;
        const data = req.body
        if(!universityId){
            res.status(400).send('University Id is required')
        }
        // else if(req){
        //     res.status(400).send('For Add Campus Contact TO Warrdel Team')
        // }
        const result = await mainServices.addCampus(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in Add Campus:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addInstitute = async (req,res) => {
    try {
        const {universityId,campusId} = req.body;
        const data = req.body
        if(!(universityId && campusId)){
            res.status(400).send('University Id and Campus Id is required')
        }
        // else if(req){
        //     res.status(400).send('For Add Institute Contact TO Warrdel Team')
        // } 
        const result = await mainServices.addInstitute(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Institute:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addAffiliatedUniversity = async (req,res) => {
    try {
        const {universityId,instituteId} = req.body;
        const data =  req.body
        if(!(universityId && instituteId)){
            res.status(400).send('University Id and institute Id is required')
        }
        const result = await mainServices.addAffiliatedUniversity(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Affiliated University:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addCourse = async (req,res) => {
    try {
        const {universityId,course_levelId} = req.body;
        const data = req.body
        if(!(universityId && course_levelId)){
            res.status(400).send('University Id and course_level Id is required')
        } 
        const result = await mainServices.addCourse(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Course:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addSpecialization = async (req,res) => {
    try {
        const {universityId,course_Id} = req.body;
        const data = req.body
        if(!(universityId && course_Id)){
            res.status(400).send('University Id and course Id is required')
        } 
        const result = await mainServices.addSpecialization(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Course:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addSubject = async (req,res) => {
    try {
        const {courseId,universityId} = req.body;
        const data = req.body
        if(!(courseId && universityId)){
            res.status(400).send('universityId and course Id is required')
        } 
        const result = await mainServices.addSubject(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add SUbject:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addClass = async (req,res) => {
    try {
        const {courseId,specializationId} = req.body;
        const data = req.body
        if(!(courseId || specializationId)){
            res.status(400).send('specializationId Or course Id is required')
        } 
        const result = await mainServices.addClass(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Class:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getClass = async (req,res) => {
    try {
        const classSectionIds = req.query.classSectionId;
        const classSectionId = classSectionIds || 0
        const result = await mainServices.getClassDetails(classSectionId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addClassSubjectMapper = async (req,res) => {
    try {
        const {classSectionId} = req.body;
        const data = req.body
        if(!(classSectionId)){
            res.status(400).send('classSectionId is required')
        } 
        const result = await mainServices.addClassSubjectMapper(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Class Subject Mapper:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getClassSubjectMapper = async (req,res) => {
    try {
        const classSectionId = req.query.classSectionId  || 0;
        const result = await mainServices.getClassSubjectMapper(classSectionId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addSemester = async (req,res) => {
    try {
        const {universityId,courseId} = req.body;
        const data = req.body
        if(!(universityId && courseId)){
            res.status(400).send('universityId and courseId is required')
        } 
        const result = await mainServices.addSemester(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add semester:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSemester = async (req,res) => {
    try {
        const courseId = req.query.courseId  || 0;
        const specializationId = req.query.specializationId;
        const result = await mainServices.getSemester(courseId,specializationId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting semester:", error);
        res.status(500).send("Internal Server Error");
    }
};