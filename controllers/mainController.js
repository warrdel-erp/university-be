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

export const addCourseLevel = async (req,res) => {
    try {
        const {universityId,affiliatedUniversityId} = req.body;
        const data = req.body
        if(!(universityId && affiliatedUniversityId)){
            res.status(400).send('University Id and affiliated UniversityId is required')
        } 
        const result = await mainServices.addCourseLevel(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Course Level:", error);
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