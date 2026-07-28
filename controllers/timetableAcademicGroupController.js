import * as timeTableServices from '../services/timeTableServices.js';
import * as timeTableCreateServices from '../services/timeTableCreateServices.js';
import { ErrorResponse, SuccessResponse } from '../utility/response.js';

export const addStructureScopeMapping = async (req, res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableServices.addStructureCourseMapping(data, createdBy, updatedBy);
        return SuccessResponse(res, 200, 'Structure group scope mapping added successfully', result);
    } catch (error) {
        console.error('Error in adding structure scope mapping:', error);
        return ErrorResponse(res, 400, error.message || 'Internal Server Error');
    }
};

export const getStructureScopeMappings = async (req, res) => {
    try {
        const filters = req.query;
        const result = await timeTableServices.getStructureMappingPrintData(filters);
        return SuccessResponse(res, 200, 'Structure scope mappings fetched successfully', result);
    } catch (error) {
        console.error('Error in getting structure scope mappings:', error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const deleteStructureScopeMapping = async (req, res) => {
    try {
        const { timetableStructureCourseMapperId } = req.query;
        const result = await timeTableServices.deleteStructureCourseMapping(timetableStructureCourseMapperId);
        return SuccessResponse(res, 200, 'Structure scope mapping deleted successfully', result);
    } catch (error) {
        console.error('Error in deleting structure scope mapping:', error);
        return ErrorResponse(res, 400, error.message || 'Internal Server Error');
    }
};

export const addAcademicGroupRoutine = async (req, res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.addtimeTableCreate(data, createdBy, updatedBy);
        return SuccessResponse(res, 200, 'Academic group routine created successfully', result);
    } catch (error) {
        console.error('Error in creating academic group routine:', error);
        return ErrorResponse(res, 400, error.message || 'Internal Server Error');
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

export const deleteAcademicGroupRoutine = async (req, res) => {
    try {
        const { timeTableRoutineId } = req.query;
        const result = await timeTableCreateServices.deleteTimeTableRoutine(timeTableRoutineId);
        return SuccessResponse(res, 200, result.message || 'Academic group routine deleted successfully', result);
    } catch (error) {
        console.error('Error in deleting academic group routine:', error);
        return ErrorResponse(res, 400, error.message || 'Internal Server Error');
    }
};
