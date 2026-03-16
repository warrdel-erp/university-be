import * as teacherMapping from '../services/teacherMappingServices.js'

export const teacherSubjectMapping = async (req, res) => {
    let { employeeId, classSubjectMapperId } = req.body;
    const data = req.body
    const createdBy = req.user.userId;
    try {
        // required fields
        if (!(employeeId && classSubjectMapperId)) {
            return res.status(400).send("employeeId, classSubjectMapperId is required");
        }

        // Add the teacher subject mapping
        const result = await teacherMapping.teacherSubjectMappingService(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in teacher subject mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const teacherSectionMapping = async (req, res) => {
    let { employeeId, classSectionsId } = req.body;
    const createdBy = req.user.userId;
    const data = req.body
    try {
        //  required fields
        if (!(employeeId && classSectionsId)) {
            return res.status(400).send(" employeeId, classSectionsId is required");
        }

        const result = await teacherMapping.teacherSectionMappingService(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in teacher Section Mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getTeacherSubjectMapping = async (req, res) => {
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    let { employeeId, acedmicYearId } = req.query
    employeeId = employeeId || 0
    try {
        const result = await teacherMapping.getTeacherSubjectMappingService(employeeId, universityId, acedmicYearId, instituteId, role);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting Teacher Subject Mapping:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTeacherSectionMapping = async (req, res) => {
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    let { employeeId, acedmicYearId } = req.query
    employeeId = employeeId || 0
    try {
        const result = await teacherMapping.getTeacherSectionMappingService(employeeId, universityId, acedmicYearId, instituteId, role);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting Teacher Section Mapping:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const updateTeacherSubjectMapping = async (req, res) => {
    const { data } = req.body;
    const userId = req.user.userId;

    if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).send("data must be a non-empty array");
    }

    try {
        const result = await teacherMapping.saveOrUpdateTeacherSubjectMapping(data, userId);
        return res.status(200).send(result);

    } catch (error) {
        console.error("Error while updating/inserting teacher subject mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const updateTeacherSectionMapping = async (req, res) => {
    let { employeeId, classSectionsId, teacherSectionMappingId } = req.body;
    const createdBy = req.user.userId;
    const data = req.body
    try {
        //  required fields
        if (!(employeeId && classSectionsId && teacherSectionMappingId)) {
            return res.status(400).send(" employeeId, classSectionsId and teacherSectionMappingId is required");
        }

        const result = await teacherMapping.updateTeacherSectionMapping(data, teacherSectionMappingId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in updating teacher Section Mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
}

export const deleteTeacherSectionMapping = async (req, res) => {
    const { teacherSectionMappingId } = req.params;
    try {
        if (!teacherSectionMappingId) {
            res.status(400).send("teacherSectionMappingId is required");
        } else {
            const result = await teacherMapping.deleteTeacherSectionMapping(teacherSectionMappingId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting teacherSectionMapping Id ${teacherSectionMappingId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const deleteTeacherSubjectMapping = async (req, res) => {
    const { teacherSubjectMappingId } = req.params;
    try {
        if (!teacherSubjectMappingId) {
            res.status(400).send("teacherSubjectMappingId is required");
        } else {
            const result = await teacherMapping.deleteTeacherSubjectMapping(teacherSubjectMappingId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting teacher Subject Mapping Id ${teacherSubjectMappingId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};