import * as mainServices from '../services/mainServices.js';
import * as fileHandler from '../utility/fileHandler.js';
import { getTenantStore, getAcademicYearId } from '../utility/requestContext.js';

export const getAllCollegesAndCourses = async (req, res) => {
    try {
        const result = await mainServices.getAllCollegesAndCourses();
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all course:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addCampus = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const data = req.body
        if (!getTenantStore().universityId) {
            return res.status(400).send('University Id is required')
        }
        const result = await mainServices.addCampus(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in Add Campus:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addInstitute = async (req, res) => {
    try {
        const { campusId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!campusId) {
            return res.status(400).send('Campus Id is required')
        }
        const result = await mainServices.addInstitute(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Institute:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addAffiliatedUniversity = async (req, res) => {
    try {
        const { instituteId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!instituteId) {
            return res.status(400).send('institute Id is required')
        }
        const result = await mainServices.addAffiliatedUniversity(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Affiliated University:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addCourse = async (req, res) => {
    try {
        const result = await mainServices.addCourse(req.body, req.user.userId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Course:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /required|Unknown term|not found|scope/i.test(message) ? 400 : 500;
        return res.status(statusCode).send(message);
    }
};

export const updateCourse = async (req, res) => {
    try {
        const result = await mainServices.updateCourse(req.body);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in update Course:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /required|not found|scope/i.test(message) ? 400 : 500;
        return res.status(statusCode).send(message);
    }
};

export const changeCourseStatus = async (req, res) => {
    try {
        const { courseId, isActive } = req.body;
        const result = await mainServices.changeCourseStatus(courseId, isActive);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in change Course status:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /required|not found|scope/i.test(message) ? 400 : 500;
        return res.status(statusCode).send(message);
    }
};

export const addSpecialization = async (req, res) => {
    try {
        const { course_Id } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        const academicYearId = getAcademicYearId();
        if (!(getTenantStore().universityId && course_Id && academicYearId && getTenantStore().instituteId)) {
            return res.status(400).send('University Id,instituteId, course Id and academicYearId is required')
        }
        const result = await mainServices.addSpecialization(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Specialization:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addSubject = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const result = await mainServices.addSubject(req.body, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add SUbject:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /required|not found|inactive|scope|Invalid/i.test(message) ? 400 : 500;
        return res.status(statusCode).send(message);
    }
};

export const updateSubject = async (req, res) => {
    try {
        const data = req.body;
        const result = await mainServices.updateSubject(data);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in update SUbject:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /required|not found|inactive|Invalid/i.test(message) ? 400 : 500;
        return res.status(statusCode).send(message);
    }
};

export const addClassSections = async (req, res) => {
    try {
        if (!req.body?.courseId) {
            return res.status(400).send('course Id is required');
        }
        const result = await mainServices.addClassSections(req.body, req.user.userId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in add class sections:", error);
        const message = error.message || 'Internal Server Error';
        return res.status(/required|found|Active institute/.test(message) ? 400 : 500).send(message);
    }
};

export const getClassSections = async (req, res) => {
    try {
        const rawClassSectionId = req.query.classSectionId ?? req.query.classSectionsId;
        const classSectionId =
            rawClassSectionId != null && rawClassSectionId !== ''
                ? Number(rawClassSectionId)
                : 0;
        const result = await mainServices.getClassSectionDetails(classSectionId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class section details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getClassSectionSpecific = async (req, res) => {
    try {
        const { campusId, courseId, sessionId } = req.query
        const result = await mainServices.getClassSectionSpecific(campusId, undefined, undefined, courseId, sessionId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class section specific details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addSectionSubjectMapper = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const data = req.body;
        if (!getTenantStore().instituteId) {
            return res.status(400).send('instituteId is required')
        }
        const result = await mainServices.addSectionSubjectMapper(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in add section subject mapper:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getSectionSubjectMapper = async (req, res) => {
    try {
        const term = req.query.term ? Number(req.query.term) : undefined;
        const result = await mainServices.getSectionSubjectMapper(term);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting section subject mapper:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const subjectExcel = async (req, res) => {
    try {
        const { courseId, specializationId } = req.body;
        const createdBy = req.user.userId;
        const academicYearId = getAcademicYearId();
        if (!(courseId && getTenantStore().instituteId && academicYearId)) {
            return res.status(400).send('academicYearId, courseId and instituteId is required')
        }
        const excelFile = req.files?.subject;
        if (!excelFile) {
            return res.status(400).send('Excel file is required');
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        const result = await mainServices.subjectExcel(excelData, courseId, academicYearId, specializationId, createdBy);

        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Subject Excel:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /required|not found|inactive|scope/i.test(message) ? 400 : 500;
        res.status(statusCode).send(message);
    }
};

export const getClassSectionRecord = async (req, res) => {
    try {
        const { courseId, classSectionsId, classSectionId } = req.query;
        const result = await mainServices.getClassSectionRecord(
            courseId,
            classSectionsId ?? classSectionId,
        );
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class section record:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(error.message || "Internal Server Error");
    }
};

export async function getMonthlyIncome(req, res) {
    try {
        const data = await mainServices.getMonthlyIncomeService();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error in getMonthlyIncome:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getClassSectionsByFilter = async (req, res) => {
    try {
        const { sessionId, courseId } = req.query;
        if (!sessionId || !courseId) {
            return res.status(400).send("sessionId and courseId are required");
        }

        const result = await mainServices.getClassSectionsByFilter(sessionId, courseId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getClassSectionsByFilter Details:", error);
        return res.status(500).send({ message: error.message });
    }
};
