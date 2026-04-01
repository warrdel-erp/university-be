import * as mainServices from '../services/mainServices.js';
import * as fileHandler from '../utility/fileHandler.js';

export const getAllCollegesAndCourses = async (req, res) => {
    const universityId = req.user.universityId;
    const role = req.user.role;
    const headInstituteId = req.user.defaultInstituteId;

    try {
        const campusId = req.query.campusId;
        const instituteId = req.query.instituteId;
        const acedmicYearId = req.query.acedmicYearId;
        if (!universityId) {
            return res.status(400).send('University Id is required')
        }
        const result = await mainServices.getAllCollegesAndCourses(universityId, campusId, instituteId, acedmicYearId, role, headInstituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all course:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addCampus = async (req, res) => {
    try {
        const { universityId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!universityId) {
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
        const { universityId, campusId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!(universityId && campusId)) {
            return res.status(400).send('University Id and Campus Id is required')
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
        const { universityId, instituteId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        if (!(universityId && instituteId)) {
            return res.status(400).send('University Id and institute Id is required')
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
        const { course_levelId, affiliatedUniversityId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body;
        const instituteId = req.user.defaultInstituteId;
        const universityId = req.user.universityId;

        if (!(universityId && course_levelId && affiliatedUniversityId && instituteId)) {
            return res.status(400).send('University Id,instituteId,affiliatedUniversityId and course_level Id is required')
        }
        const result = await mainServices.addCourse(data, createdBy, instituteId, universityId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Course:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const changeCourseStatus = async (req, res) => {
    try {
        const { courseId } = req.query;
        if (!(courseId)) {
            return res.status(400).send('courseId is required')
        }
        const result = await mainServices.changeCourseStatus(courseId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  change status Course:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addSpecialization = async (req, res) => {
    try {
        const { universityId, course_Id, acedmicYearId } = req.body;
        const createdBy = req.user.userId;
        const data = req.body
        const instituteId = req.user.defaultInstituteId;
        if (!(universityId && course_Id && acedmicYearId && instituteId)) {
            return res.status(400).send('University Id,instituteId, course Id and acedmicYearId is required')
        }
        const result = await mainServices.addSpecialization(data, createdBy, instituteId);
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
        const instituteId = req.user.defaultInstituteId;
        const universityId = req.user.universityId;

        if (!(courseId && universityId && acedmicYearId && instituteId)) {
            return res.status(400).send('universityId ,instituteId, course Id and acedmicYearId is required')
        }
        const result = await mainServices.addSubject(data, createdBy, instituteId, universityId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add SUbject:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const updateSubject = async (req, res) => {
    try {
        const updateBy = req.user.userId;
        const { subjectId } = req.body;
        const data = req.body;
        const instituteId = req.user.defaultInstituteId;
        if (!(subjectId)) {
            return res.status(400).send('subjectId is required')
        }
        const result = await mainServices.updateSubject(data, updateBy, instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in update SUbject:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addClass = async (req, res) => {
    try {
        const { courseId, specializationId } = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const instituteId = req.user.defaultInstituteId;
        const data = req.body
        if (!(courseId || specializationId)) {
            return res.status(400).send('specializationId Or course Id is required')
        }
        const result = await mainServices.addClass(data, createdBy, universityId, instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Class:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getClass = async (req, res) => {
    try {
        const classSectionIds = req.query.classSectionId;
        const acedmicYearId = req.query.acedmicYearId
        const classSectionId = classSectionIds || 0;
        const universityId = req.user.universityId;
        const role = req.user.role;
        const instituteId = req.user.defaultInstituteId;
        const result = await mainServices.getClassDetails(classSectionId, universityId, acedmicYearId, instituteId, role);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Section Details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getClassSpecific = async (req, res) => {
    try {
        const { campusId, instituteId, acedmicYearId, courseId, sessionId } = req.query
        const universityId = req.user.universityId;
        const role = req.user.role;
        const headInstituteId = req.user.defaultInstituteId;
        const result = await mainServices.getClassSpecific(universityId, headInstituteId, role, campusId, instituteId, acedmicYearId, courseId, sessionId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class specific Details:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addClassSubjectMapper = async (req, res) => {
    try {
        // const {classId} = req.body;
        const createdBy = req.user.userId;
        const data = req.body;
        const instituteId = req.user.defaultInstituteId;
        if (!(instituteId)) {
            return res.status(400).send('semesterId and instituteId is required')
        }
        const result = await mainServices.addClassSubjectMapper(data, createdBy, instituteId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add semester Subject Mapper:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getClassSubjectMapper = async (req, res) => {
    try {
        const semesterId = req.query.semesterId || 0;
        const acedmicYearId = req.query.acedmicYearId
        const universityId = req.user.universityId;
        const role = req.user.role;
        const instituteId = req.user.defaultInstituteId;
        const result = await mainServices.getClassSubjectMapper(semesterId, universityId, acedmicYearId, instituteId, role);
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
        const universityId = req.user.universityId;
        const data = req.body
        const instituteId = req.user.defaultInstituteId;
        if (!(universityId && courseId && acedmicYearId && instituteId)) {
            return res.status(400).send('universityId,instituteId,acedmicYearId and courseId is required')
        }
        const result = await mainServices.addSemester(data, createdBy, universityId, instituteId);
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
        const universityId = req.user.universityId;
        const role = req.user.role;
        const instituteId = req.user.defaultInstituteId;
        const result = await mainServices.getSemester(courseId, specializationId, universityId, acedmicYearId, instituteId, role);
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
        const universityId = req.user.universityId;
        const data = req.body
        const instituteId = req.user.defaultInstituteId;
        if (!(acedmicYearId && courseId && instituteId)) {
            return res.status(400).send('acedmicYearId ,instituteId and courseId is required')
        }
        const result = await mainServices.createClass(data, createdBy, universityId, instituteId);
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
        const universityId = req.user.universityId;
        const data = req.body;
        const instituteId = req.user.defaultInstituteId;
        if (!(courseId && instituteId && acedmicYearId)) {
            return res.status(400).send('acedmicYearId, courseId and instituteId is required')
        }
        const excelFile = req.files?.subject;
        if (!excelFile) {
            return res.status(400).send('Excel file is required');
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        const result = await mainServices.subjectExcel(excelData, courseId, acedmicYearId, specializationId, createdBy, universityId, instituteId);

        res.status(200).send(result);
    } catch (error) {
        console.error("Error in  Add Subject Excel:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getClassRecord = async (req, res) => {
    try {
        const semesterId = req.query.semesterId;
        const acedmicYearId = req.query.acedmicYearId
        const courseId = req.query.courseId;
        const classSectionId = req.query.classSectionId
        // const universityId = req.user.universityId;
        // const role = req.user.role;    
        // const instituteId = req.user.defaultInstituteId;
        const result = await mainServices.getClassRecord(courseId, semesterId, classSectionId, acedmicYearId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class record Details:", error);
        return res.status(500).send("Internal Server Error");
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
        const universityId = req.user.universityId;
        const acedmicYearId = req.user.defaultAcademicYearId;

        const result = await mainServices.getClassSectionsByFilter(sessionId, courseId, universityId, acedmicYearId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getClassSectionsByFilter Details:", error);
        return res.status(500).send({ message: error.message });
    }
};