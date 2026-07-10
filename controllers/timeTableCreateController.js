import * as timeTableCreateServices from '../services/timeTableCreateServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

const BUSINESS_ERROR =
    /required|not found|overlap|conflict|does not match|could not be resolved|invalid|already|cannot|before|after/i;

export const addtimeTableCreate = async (req, res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.addtimeTableCreate(data, createdBy, updatedBy);
        return SuccessResponse(res, 200, 'Time table created successfully', result);
    } catch (error) {
        console.error("Error in adding time table create :", error);
        const statusCode = BUSINESS_ERROR.test(error.message || '') ? 400 : 500;
        return ErrorResponse(res, statusCode, error.message || 'Internal Server Error');
    }
};

export const cloneTimeTableRoutine = async (req, res) => {
    try {
        const { previousRoutineId, startingDate, endingDate } = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.cloneTimeTableRoutine(
            previousRoutineId,
            startingDate,
            endingDate,
            createdBy,
            updatedBy,
        );
        return SuccessResponse(res, 200, 'Routine cloned successfully', result);
    } catch (error) {
        console.error("Error in cloning time table routine:", error);
        const statusCode = BUSINESS_ERROR.test(error.message || '') ? 400 : 500;
        return ErrorResponse(res, statusCode, error.message || 'Internal Server Error');
    }
};

export const gettimeTableCreateDetails = async (req, res) => {
    try {
        const { courseId, sessionId } = req.query;
        const result = await timeTableCreateServices.gettimeTableCreateDetails({
            courseId,
            sessionId,
        });
        return SuccessResponse(res, 200, 'Time table routines fetched successfully', result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getSingletimeTableCreateDetails = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getSingletimeTableCreateDetails(courseId);
        return SuccessResponse(res, 200, 'Time table routine fetched successfully', result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getTimeTableByCourseAndSection = async (req, res) => {
    const { courseId, classSectionTermId, timeTableType } = req.query;
    try {
        const result = await timeTableCreateServices.getTimeTableByCourseAndSection(
            courseId,
            classSectionTermId,
            timeTableType,
        );
        return SuccessResponse(res, 200, 'Time table fetched successfully', result);
    } catch (error) {
        console.error("Error fetching timetable:", error);
        const statusCode = BUSINESS_ERROR.test(error.message || '') ? 400 : 500;
        return ErrorResponse(res, statusCode, error.message || 'Internal Server Error');
    }
};

export const addtimeTableMapping = async (req, res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.addtimeTableMapping(
            data,
            createdBy,
            updatedBy,
        );
        return SuccessResponse(res, 200, 'Time table mapping added successfully', result);
    } catch (error) {
        console.error("Error in adding time table mapping:", error);
        const statusCode = BUSINESS_ERROR.test(error.message || '') ? 400 : 500;
        return ErrorResponse(res, statusCode, error.message || 'Internal Server Error');
    }
};

export const getTimeTableMappingDetail = async (req, res) => {
    const { timeTableRoutineId } = req.body;
    try {
        const result = await timeTableCreateServices.getTimeTableMappingDetail(timeTableRoutineId);
        return SuccessResponse(res, 200, 'Time table mapping fetched successfully', result);
    } catch (error) {
        console.error("Error in getting time table mapping:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getSingletimeTableMappingDetail = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getSingletimeTableMappingDetail(courseId);
        return SuccessResponse(res, 200, 'Time table mapping fetched successfully', result);
    } catch (error) {
        console.error("Error in getting single time table mapping:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const changeTimeTableCreate = async (req, res) => {
    const updatedBy = req.user.userId;
    try {
        const result = await timeTableCreateServices.changeTimeTableCreate(req.body, updatedBy);
        return SuccessResponse(res, 200, 'Time table routine updated successfully', result);
    } catch (error) {
        console.error("Error in updating time table create", error);
        const statusCode = BUSINESS_ERROR.test(error.message || '') ? 400 : 500;
        return ErrorResponse(res, statusCode, error.message || 'Internal Server Error');
    }
};

export const updatetimeTableCreate = async (req, res) => {
    const { timeTableType, timeTableMappingId } = req.body;
    const updatedBy = req.user.userId;
    try {
        const result = await timeTableCreateServices.updatetimeTableCreate(
            timeTableMappingId,
            timeTableType,
            updatedBy,
        );
        return SuccessResponse(res, 200, 'Time table mapping updated successfully', result);
    } catch (error) {
        console.error("Error in updating time table type", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const updateSimpleTeacherMappingController = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.updateSimpleTeacherMapping(
            req.body,
            createdBy,
            updatedBy,
        );
        return SuccessResponse(res, 200, 'Teacher mapping updated successfully', result);
    } catch (error) {
        console.error("Error in updateSimpleTeacherMappingController:", error);
        const statusCode = BUSINESS_ERROR.test(error.message || '') ? 400 : 500;
        return ErrorResponse(res, statusCode, error.message || 'Internal Server Error');
    }
};

export const deletetimeTableMapping = async (req, res) => {
    const { timeTableMappingId, deleteCombinedGroup } = req.query;
    try {
        const result = await timeTableCreateServices.deletetimeTableMapping(timeTableMappingId, {
            deleteCombinedGroup: deleteCombinedGroup === true || deleteCombinedGroup === 'true',
        });
        return SuccessResponse(res, 200, 'Time table mapping deleted successfully', result);
    } catch (error) {
        console.error(`Error in deleting time table mapping Id ${timeTableMappingId}:`, error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getTimeTableCellData = async (req, res) => {
    const { courseId, classSectionTermId } = req.query;
    try {
        const result = await timeTableCreateServices.getTimeTableCellData(courseId, classSectionTermId);
        return SuccessResponse(res, 200, 'Time table cell data fetched successfully', result);
    } catch (error) {
        console.error("Error in getting time table cell data:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getTimeTableElective = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getTimeTableElective(courseId);
        return SuccessResponse(res, 200, 'Elective time table fetched successfully', result);
    } catch (error) {
        console.error("Error in getting time table elective:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const publishTimeTable = async (req, res) => {
    try {
        const { timeTableRoutineId } = req.query;
        const result = await timeTableCreateServices.publishTimeTableService(timeTableRoutineId);
        return SuccessResponse(res, 200, 'Time table published successfully', result);
    } catch (error) {
        console.error("Error in publishing time table:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const ClassSubjectCount = async (req, res) => {
    try {
        const { classSectionTermId } = req.query;
        const result = await timeTableCreateServices.getSubjectWithCount(classSectionTermId);
        return SuccessResponse(res, 200, 'Subject count fetched successfully', result);
    } catch (error) {
        console.error("Error in getting subject count:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getRoutineByClassSectionId = async (req, res) => {
    const { classSectionTermId } = req.query;
    try {
        const result = await timeTableCreateServices.getRoutineByClassSectionId(classSectionTermId);
        return SuccessResponse(res, 200, 'Routine fetched successfully', result);
    } catch (error) {
        console.error("Error in getting routine by class section id:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getRoutineByTeacherAndAcademicYear = async (req, res) => {
    const { employeeId, courseId, sessionId } = req.query;
    try {
        const result = await timeTableCreateServices.getRoutineByTeacherAndAcademicYear(
            employeeId,
            courseId,
            sessionId,
        );
        return SuccessResponse(res, 200, 'Teacher routine fetched successfully', result);
    } catch (error) {
        console.error("Error in getting routine by teacher and academic year:", error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};
