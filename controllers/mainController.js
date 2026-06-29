import * as mainServices from '../services/mainServices.js';
import * as fileHandler from '../utility/fileHandler.js';
import { getTenantStore } from '../utility/requestContext.js';

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
        const { course_Id, acedmicYearId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!(getTenantStore().universityId && course_Id && acedmicYearId && getTenantStore().instituteId)) {
            return res.status(400).send('University Id,instituteId, course Id and acedmicYearId is required')
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
        const { courseId, acedmicYearId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!(courseId && getTenantStore().universityId && acedmicYearId && getTenantStore().instituteId)) {
            return res.status(400).send('universityId ,instituteId, course Id and acedmicYearId is required')
        }
        const result = await mainServices.addSubject(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add SUbject:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /required|not found|inactive|scope/i.test(message) ? 400 : 500;
        return res.status(statusCode).send(message);
    }
};

export const updateSubject = async (req, res) => {
    try {
        const updateBy = req.user.userId;
        const { subjectId } = req.body;
        const data = req.body;
        if (!(subjectId)) {
            return res.status(400).send('subjectId is required')
        }
        const result = await mainServices.updateSubject(data, updateBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in update SUbject:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addClass = async (req, res) => {
    try {
        if (!req.body?.courseId) {
            return res.status(400).send('course Id is required');
        }
        const result = await mainServices.addClass(req.body, req.user.userId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Class:", error);
        const message = error.message || 'Internal Server Error';
        return res.status(/required|found|Active institute/.test(message) ? 400 : 500).send(message);
    }
};

export const getClass = async (req, res) => {
    try {
        const rawClassSectionId = req.query.classSectionId ?? req.query.classSectionsId;
        const classSectionId =
            rawClassSectionId != null && rawClassSectionId !== ''
                ? Number(rawClassSectionId)
                : 0;
        const acedmicYearId = req.query.acedmicYearId
            ? Number(req.query.acedmicYearId)
            : undefined;
        const result = await mainServices.getClassDetails(classSectionId, acedmicYearId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getClassSpecific = async (req, res) => {
    try {
        const { campusId, instituteId, acedmicYearId, courseId, sessionId } = req.query
        const result = await mainServices.getClassSpecific(campusId, instituteId, acedmicYearId, courseId, sessionId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class specific Details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addClassSubjectMapper = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const data = req.body;
        if (!getTenantStore().instituteId) {
            return res.status(400).send('instituteId is required')
        }
        const result = await mainServices.addClassSubjectMapper(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add semester Subject Mapper:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getClassSubjectMapper = async (req, res) => {
    try {
        const semesterId = req.query.semesterId ? Number(req.query.semesterId) : undefined;
        const acedmicYearId = req.query.acedmicYearId ? Number(req.query.acedmicYearId) : undefined;
        const result = await mainServices.getClassSubjectMapper(semesterId, acedmicYearId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addSemester = async (req, res) => {
    try {
        const { courseId, acedmicYearId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!(getTenantStore().universityId && courseId && acedmicYearId && getTenantStore().instituteId)) {
            return res.status(400).send('universityId,instituteId,acedmicYearId and courseId is required')
        }
        const result = await mainServices.addSemester(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add semester:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getSemester = async (req, res) => {
    try {
        const courseId = req.query.courseId || 0;
        const acedmicYearId = req.query.acedmicYearId
        const specializationId = req.query.specializationId;
        const result = await mainServices.getSemester(courseId, specializationId, acedmicYearId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting semester:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const createClass = async (req, res) => {
    try {
        const { acedmicYearId, courseId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!(acedmicYearId && courseId && getTenantStore().instituteId)) {
            return res.status(400).send('acedmicYearId ,instituteId and courseId is required')
        }
        const result = await mainServices.createClass(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add directly class:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const subjectExcel = async (req, res) => {
    try {
        const { courseId, specializationId, acedmicYearId } = req.body;
        const createdBy = req.user.userId;
        if (!(courseId && getTenantStore().instituteId && acedmicYearId)) {
            return res.status(400).send('acedmicYearId, courseId and instituteId is required')
        }
        const excelFile = req.files?.subject;
        if (!excelFile) {
            return res.status(400).send('Excel file is required');
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        const result = await mainServices.subjectExcel(excelData, courseId, acedmicYearId, specializationId, createdBy);

        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Subject Excel:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /required|not found|inactive|scope/i.test(message) ? 400 : 500;
        res.status(statusCode).send(message);
    }
};

export const getClassRecord = async (req, res) => {
    try {
        const { courseId, classSectionsId, classSectionId } = req.query;
        const result = await mainServices.getClassRecord(
            courseId,
            classSectionsId ?? classSectionId,
        );
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class record Details:", error);
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
        const { sessionId, courseId, acedmicYearId } = req.query;
        if (!sessionId || !courseId) {
            return res.status(400).send("sessionId and courseId are required");
        }

        const result = await mainServices.getClassSectionsByFilter(sessionId, courseId, acedmicYearId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getClassSectionsByFilter Details:", error);
        return res.status(500).send({ message: error.message });
    }
};
