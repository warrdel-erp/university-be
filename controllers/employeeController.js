import * as employee from '../services/employeeServices.js';
import * as fileHandler from '../utility/fileHandler.js';
import * as AttendanceCreation from "../services/attendanceServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import { getTenantStore, getAcademicYearId } from '../utility/requestContext.js';
import { formatQueryDate } from '../utility/helper.js';

export const addEmployee = async (req, res) => {
    try {
        const data = req.body
        const file = req.files;
        const createdBy = req.user.userId;
        const { campusId, instituteId, roleId } = req.body;
        if (!(campusId && instituteId && roleId)) {
            return res.status(400).send('campusId,instituteId is required')
        }
        const result = await employee.addEmployee(data, file, createdBy, roleId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding employee:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getAllEmployee = async (req, res) => {
    const campusId = req.query.campusId ? Number(req.query.campusId) : undefined;
    const instituteId = req.query.instituteId ? Number(req.query.instituteId) : undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const tenant = getTenantStore();
    try {
        const result = await employee.getAllEmployee(campusId, instituteId, {
            userId: req.user.userId,
            role: tenant.defaultRole,
            userId,
        });
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all employee:", error);
        const message = error?.message || 'Internal Server Error';
        const statusCode = /not found|scope/i.test(message) ? 400 : 500;
        res.status(statusCode).send(message);
    }
};

export const getSingleEmployeeDetails = async (req, res) => {
    const userId = req.params.id;
    try {
        if (!userId) {
            return res.status(400).send('userId is required')
        }
        const result = await employee.getSingleEmployeeDetails(userId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single employee details:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const deleteEmployeeDetail = async (req, res) => {
    const userId = req.params.id;
    try {
        if (!userId) {
            return res.status(400).send("userId is required");
        }
        const result = await employee.deleteEmployeeDetail(userId);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in deleting userId ${userId}:`, error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).send(error.message || "Internal Server Error");
    }
};

export const importEmployeeData = async (req, res) => {
    try {
        const { campusId, instituteId, roleId } = req.body;
        const createdBy = req.user.userId;
        const data = { ...req.body, createdBy };

        if (!(campusId && instituteId && roleId)) {
            return res.status(400).json({ error: 'campusId, instituteId, and roleId are required' });
        }

        const excelFile = req.files?.employee;
        if (!excelFile) {
            return res.status(400).json({ error: 'Excel file is required' });
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        if (!excelData) {
            return res.status(400).json({ error: 'Error reading the Excel file' });
        }

        const result = await employee.importEmployeeData(excelData, data);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        return res.status(200).json({ message: result.message });

    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred' });
    }
};

export const updateEmployee = async (req, res) => {
    const userId = req.params.id;
    try {
        const data = req.body;
        const file = req.files;
        const updatedBy = req.user.userId;
        const createdBy = req.user.userId;
        const { campusId, instituteId, roleId } = req.body;

        if (!(campusId && instituteId && roleId)) {
            return res.status(400).send("campusId, instituteId and roleId are required");
        }

        const result = await employee.updateEmployee(
            userId,
            data,
            file,
            updatedBy,
            createdBy,
        );

        res.status(200).send(result);
    } catch (error) {
        console.error("Error in updating employee:", error);
        res.status(500).send("Internal Server Error");
    }
};

export async function getBooksIssuedToEmployee(req, res) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }

        const result = await employee.getBooksIssuedToEmployee(userId);
        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getTeacherTimeTable = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).send("userId is required");
        }

        const result = await employee.getTeacherTimeTable(userId);

        res.status(200).send(result);

    } catch (error) {
        console.error("Error in getTeacherTimeTable:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTeacherSubject = async (req, res) => {
    try {
        const { userId, sessionId, term } = req.query;
        const academicYearId = getAcademicYearId();

        const result = await employee.getTeacherSubject(userId, {
            sessionId,
            term,
            academicYearId: academicYearId != null && academicYearId !== '' ? Number(academicYearId) : undefined,
        });

        res.status(200).send(result);

    } catch (error) {
        console.error("Error in getTeacher subject:", error);
        res.status(500).send("Internal Server Error");
    }
};

export async function getSubjectEvalution(req, res) {
    try {
        const { userId } = req.query;
        const evaluation = await employee.getSubjectEvalution(userId);
        if (evaluation) {
            res.status(200).json(evaluation);
        } else {
            res.status(404).json({ message: "evaluation not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getTodayClassSchedule = async (req, res) => {
    try {
        const { userId, date, sessionId, groupPeriods } = req.query;
        const academicYearId = getAcademicYearId();

        if (!userId) {
            return res.status(400).send("userId is required");
        }

        if (!academicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }

        const formattedDate = formatQueryDate(date);

        let groupingType = false;
        if (groupPeriods === 'consecutive') {
            groupingType = 'consecutive';
        } else if (groupPeriods === 'sessional') {
            groupingType = 'sessional';
        }

        const result = await employee.getTodayClassSchedule(
            Number(userId),
            formattedDate,
            sessionId != null && sessionId !== '' ? Number(sessionId) : undefined,
            groupingType
        );

        res.status(200).send({ success: true, result });

    } catch (error) {
        console.error("Error in getTodayClassSchedule:", error);
        const statusCode = /scope/i.test(error.message) ? 400 : 500;
        res.status(statusCode).send({ message: error.message, success: false });
    }
};

export const getTeacherCourses = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).send('userId is required');
        }

        const result = await employee.getTeacherCourses(userId);
        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error('Error in getTeacherCourses controller:', error);
        res.status(500).send({ message: 'Internal Server Error', success: false });
    }
};

export const getTeacherSubjectsFromSchedule = async (req, res) => {
    try {
        const { userId, courseId, sessionId } = req.query;

        if (!userId) {
            return res.status(400).send('userId is required');
        }

        const result = await employee.getTeacherSubjectsFromSchedule(userId, { courseId, sessionId });
        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error('Error in getTeacherSubjectsFromSchedule controller:', error);
        res.status(500).send({ message: 'Internal Server Error', success: false });
    }
};

export const getPastClassSchedules = async (req, res) => {
    try {
        const { userId, date, sessionId, groupPeriods } = req.query;
        const academicYearId = getAcademicYearId();

        if (!userId) {
            return SuccessResponse(res, 400, "userId is required");
        }

        if (!academicYearId) {
            return SuccessResponse(res, 400, "academicYearId not found in user session");
        }

        const formattedDate = formatQueryDate(date);

        let groupingType = false;
        if (groupPeriods === 'consecutive') {
            groupingType = 'consecutive';
        } else if (groupPeriods === 'sessional') {
            groupingType = 'sessional';
        }

        const result = await employee.getPastClassSchedules(
            userId,
            academicYearId,
            formattedDate,
            groupingType,
            sessionId != null && sessionId !== '' ? Number(sessionId) : undefined,
        );

        return SuccessResponse(res, 200, "Past class schedules fetched successfully", result);
    } catch (error) {
        console.error("Error in getPastClassSchedules:", error);
        return ErrorResponse(res, 500, "Internal Server Error");
    }
};

export const getUpcomingClassSchedules = async (req, res) => {
    try {
        const { userId, date, groupPeriods } = req.query;
        const academicYearId = getAcademicYearId();

        if (!userId) {
            return res.status(400).send("userId is required");
        }

        if (!academicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }

        const currentDate = date ? new Date(date) : new Date();
        const formattedDate = formatQueryDate(date);

        let groupingType = false;
        if (groupPeriods === 'consecutive') {
            groupingType = 'consecutive';
        } else if (groupPeriods === 'sessional') {
            groupingType = 'sessional';
        }

        const result = await employee.getUpcomingClassSchedules(
            userId,
            academicYearId,
            formattedDate,
            groupingType
        );

        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error("Error in getUpcomingClassSchedules:", error);
        res.status(500).send({ message: "Internal Server Error", success: false });
    }
};

export const getSectionCounts = async (req, res) => {
    try {
        const { userId, date } = req.query;
        const academicYearId = getAcademicYearId();

        if (!userId) {
            return ErrorResponse(res, 400, "userId is required");
        }

        if (!academicYearId) {
            return ErrorResponse(res, 400, "academicYearId not found in user session");
        }

        const currentDate = date ? new Date(date) : new Date();
        const formattedDate = formatQueryDate(date);

        const { pastCount, upcomingCount, uniqueCombinationsCount, uniqueSubjectsCount } = await employee.getSectionCounts(
            userId,
            academicYearId,
            formattedDate
        );

        return SuccessResponse(res, 200, "Section counts fetched successfully", {
            pastClassesCount: pastCount,
            upcomingClassesCount: upcomingCount,
            uniqueCombinationsCount,
            uniqueSubjectsCount
        });
    } catch (error) {
        console.error("Error in getSectionCounts:", error);
        return ErrorResponse(res, 500, "Internal Server Error");
    }
};

export const getUniqueClassSectionSubjects = async (req, res) => {
    try {
        const { userId } = req.query;
        const academicYearId = getAcademicYearId();

        if (!academicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }

        const result = await employee.getUniqueClassSectionSubjects(
            userId,
            academicYearId
        );

        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error("Error in getUniqueClassSectionSubjects:", error);
        res.status(500).send({ message: "Internal Server Error", success: false });
    }
};

export async function getEmployeeSectionDates(req, res) {
    try {
        const { classSectionTermId, subjectId, userId } = req.query;

        const data = await AttendanceCreation.getEmployeeSectionDates(
            classSectionTermId,
            subjectId,
            userId
        );

        return SuccessResponse(res, 200, "Employee section dates fetched successfully", data);
    } catch (error) {
        console.error("Controller Error:", error);
        return ErrorResponse(res, 500, "Internal Server Error");
    }
};