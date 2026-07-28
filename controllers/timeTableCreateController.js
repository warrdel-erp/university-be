import * as timeTableCreateServices from '../services/timeTableCreateServices.js';
import * as timeTableServices from '../services/timeTableServices.js';
import { ErrorResponse, SuccessResponse } from '../utility/response.js';


export const addtimeTableCreate = async (req, res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.addtimeTableCreate(data, createdBy, updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding time table create :", error);
        const message = error.message || 'Internal Server Error';
        const statusCode =
            /required|not found|does not match|could not be resolved|overlap|conflict|Routine already exists|Teacher conflict|Room conflict|must be inside|within the mapped date range|Map the course to the structure first|Invalid mapperId/i.test(message)
                ? 400
                : 500;
        res.status(statusCode).send(message);
    }
};

export const cloneTimeTableRoutine = async (req, res) => {
    try {
        const { previousRoutineId, startingDate, endingDate, previousDate } = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.cloneTimeTableRoutine(
            previousRoutineId,
            startingDate,
            endingDate,
            createdBy,
            updatedBy,
            previousDate,
        );
        return SuccessResponse(res, 200, 'Routine cloned successfully', result);
    } catch (error) {
        console.error("Error in cloning time table routine:", error);
        return ErrorResponse(
            res,
            error.statusCode || 500,
            error.message || 'Internal Server Error',
        );
    }
};

export const gettimeTableCreateDetails = async (req, res) => {
    try {
        const { courseId, sessionId } = req.query;
        const result = await timeTableCreateServices.gettimeTableCreateDetails({
            courseId,
            sessionId,
        });
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingletimeTableCreateDetails = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getSingletimeTableCreateDetails(courseId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        res.status(500).send("Internal Server Error");
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
        SuccessResponse(res, 200, 'Time table fetched successfully', result);
    } catch (error) {
        ErrorResponse(res, 500, "Internal Server Error");
        console.error("Error fetching timetable:", error);
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
            updatedBy
        );
        res.status(200).send(result);
    } catch (error) {
        res.status(error.statusCode || 400).send({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};

export const getTimeTableMappingDetail = async (req, res) => {
    const { timeTableRoutineId } = req.body;
    try {
        const result = await timeTableCreateServices.getTimeTableMappingDetail(timeTableRoutineId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingletimeTableMappingDetail = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getSingletimeTableMappingDetail(courseId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const changeTimeTableCreate = async (req, res) => {
    const updatedBy = req.user.userId;
    try {
        if (Array.isArray(req.body)) {
            const result = await timeTableServices.updateTimeTable(req.body);
            return SuccessResponse(res, 200, 'Time table updated successfully', result);
        }

        const result = await timeTableCreateServices.changeTimeTableCreate(req.body, updatedBy);
        return SuccessResponse(res, 200, 'Routine updated successfully', result);
    } catch (error) {
        console.error('Error in updating time table create', error);
        const message = error.message || 'Internal Server Error';
        const statusCode =
            /not found|cannot be updated|starting date|overlap|conflict|Routine already exists|Teacher conflict|Room conflict|does not match|required|must be inside|within the mapped date range|Map the course to the structure first|Invalid mapperId/i.test(message)
                ? 400
                : 500;
        return ErrorResponse(res, statusCode, message);
    }
};

export const updatetimeTableCreate = async (req, res) => {
    const { timeTableType, timeTableCellId } = req.body;
    const updatedBy = req.user.userId;
    try {
        const result = await timeTableCreateServices.updatetimeTableCreate(timeTableCellId, timeTableType, updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in updating time table type`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const updateSimpleTeacherMappingController = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.updateSimpleTeacherMapping(
            req.body,
            createdBy,
            updatedBy
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Error in updateSimpleTeacherMappingController:", err);
        res.status(500).send({ success: false, message: err.message });
    }
};

export const deletetimeTableMapping = async (req, res) => {
    const { timeTableCellId, deleteCombinedGroup } = req.query;
    try {
        const result = await timeTableCreateServices.deletetimeTableMapping(timeTableCellId, {
            deleteCombinedGroup: deleteCombinedGroup === true || deleteCombinedGroup === 'true',
        });
        return SuccessResponse(res, 200, result.message, result);
    } catch (error) {
        console.error(`Error in deleting time table mapping Id ${timeTableCellId}:`, error);
        const message = error.message || 'Internal Server Error';
        const statusCode = error.statusCode
            || (/not found/i.test(message) ? 404 : /starting date|published routine|cannot edit or delete/i.test(message) ? 400 : 500);
        return ErrorResponse(res, statusCode, message);
    }
};

export const getTimeTableCellData = async (req, res) => {
    const { courseId, classSectionTermId } = req.query;
    try {
        const result = await timeTableCreateServices.getTimeTableCellData(courseId, classSectionTermId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table cell data:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableElective = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getTimeTableElective(courseId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table cell data:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const publishTimeTable = async (req, res) => {
    try {
        const { timeTableRoutineId } = req.query;
        const response = await timeTableCreateServices.publishTimeTableService(timeTableRoutineId);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

export const deleteTimeTableRoutine = async (req, res) => {
    try {
        const { timeTableRoutineId } = req.query;
        const result = await timeTableCreateServices.deleteTimeTableRoutine(timeTableRoutineId);
        return SuccessResponse(res, 200, result.message, result);
    } catch (error) {
        console.error(`Error in deleting routine ${req.query.timeTableRoutineId}:`, error);
        const message = error.message || 'Internal Server Error';
        const statusCode = /not found/i.test(message) ? 404 : /cannot be deleted|cannot be updated|starting date/i.test(message) ? 400 : 500;
        return ErrorResponse(res, statusCode, message);
    }
};

export const ClassSubjectCount = async (req, res) => {
    try {
        const { classSectionTermId } = req.query;
        const response = await timeTableCreateServices.getSubjectWithCount(classSectionTermId);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

export const getRoutineByClassSectionId = async (req, res) => {
    const { classSectionTermId } = req.query;
    try {
        const result = await timeTableCreateServices.getRoutineByClassSectionId(classSectionTermId);
        SuccessResponse(res, 200, 'Routine fetched successfully', result);
    } catch (error) {
        ErrorResponse(res, 500, "Internal Server Error");
    }
};

export const getRoutineByTeacherAndAcademicYear = async (req, res) => {
    const { userId, courseId, sessionId, subjectId } = req.query;
    try {
        const result = await timeTableCreateServices.getRoutineByTeacherAndAcademicYear(
            userId,
            courseId,
            sessionId,
            subjectId,
        );
        return SuccessResponse(res, 200, 'Teacher routine fetched successfully', result);
    } catch (error) {
        console.error('Error in getting routine by teacher and academic year:', error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getDateWiseCellsBySection = async (req, res) => {
    const { courseId, sessionId, classSectionTermId, date } = req.query;
    try {
        const result = await timeTableCreateServices.getDateWiseCellsBySection(
            courseId,
            sessionId,
            classSectionTermId,
            { date },
        );
        return SuccessResponse(res, 200, 'Date-wise cells fetched successfully', result);
    } catch (error) {
        console.error('Error in getting date-wise cells:', error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const updateDateWiseCellController = async (req, res) => {
    const {
        timeTableCellDateWiseId,
        timeTableCellTeachersDateWiseId,
        userId,
        subjectId,
        electiveSubjectId,
        classRoomSectionId,
    } = req.body;
    const updatedBy = req.user.userId;
    try {
        const result = await timeTableCreateServices.updateDateWiseCell(
            timeTableCellDateWiseId,
            {
                timeTableCellTeachersDateWiseId,
                userId,
                subjectId,
                electiveSubjectId,
                classRoomSectionId,
            },
            updatedBy,
        );
        return SuccessResponse(res, 200, 'Date-wise cell updated successfully', result);
    } catch (error) {
        console.error('Error in updating date-wise cell:', error);
        const statusCode = /not found|published/i.test(error.message || '') ? 400 : 500;
        return ErrorResponse(res, statusCode, error.message || 'Internal Server Error');
    }
};

export const getCascadingGroupRoutines = async (req, res) => {
    try {
        const { academicGroupScopeId, academicGroupId, sessionId } = req.query;
        const result = await timeTableCreateServices.getCascadingGroupRoutinesService({
            academicGroupScopeId,
            academicGroupId,
            sessionId,
        });
        return SuccessResponse(res, 200, 'Cascading group routines fetched successfully', result);
    } catch (error) {
        console.error('Error in getting cascading group routines:', error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};
