import * as teacherMapping from '../services/teacherMappingServices.js'

export const teacherSubjectMapping = async (req, res) => {
    let { employeeId, classSubjectMapperId} = req.body;
    const data = req.body
    const createdBy = req.user.userId;
    try {
        // required fields
        if (!( employeeId && classSubjectMapperId )) {
            return res.status(400).send("employeeId, classSubjectMapperId is required");
        }

        // Add the teacher subject mapping
        const result = await teacherMapping.teacherSubjectMappingService(data,createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in teacher subject mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const teacherSectionMapping = async (req, res) => {
    let { employeeId, classSectionsId} = req.body;
    const createdBy = req.user.userId;
    const data = req.body
    try {
        //  required fields
        if (!( employeeId && classSectionsId)) {
            return res.status(400).send(" employeeId, classSectionsId is required");
        }

        const result = await teacherMapping.teacherSectionMappingService(data,createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in teacher Section Mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getTeacherSubjectMapping = async (req,res) => {
    const universityId = req.user.universityId;
    let {employeeId} = req.query
    employeeId = employeeId || 0 
    try {
        const result = await teacherMapping.getTeacherSubjectMappingService(employeeId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting Teacher Subject Mapping:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTeacherSectionMapping = async (req,res) => {
    const universityId = req.user.universityId;
    let {employeeId} = req.query
    employeeId = employeeId || 0 
    try {
        const result = await teacherMapping.getTeacherSectionMappingService(employeeId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting Teacher Section Mapping:", error);
        res.status(500).send("Internal Server Error");
    }
};