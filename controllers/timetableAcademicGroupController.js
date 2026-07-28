import * as timeTableServices from '../services/timeTableServices.js';
import * as timeTableCreateServices from '../services/timeTableCreateServices.js';
import * as academicGroupScopeService from '../services/academicGroupScopeService.js';
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

export const getAllStructureScopeMappings = async (req, res) => {
    try {
        const filters = req.query;
        const result = await timeTableServices.getAllStructureScopeMappings(filters);
        return SuccessResponse(res, 200, 'All structure scope mappings fetched successfully', result);
    } catch (error) {
        console.error('Error in getting all structure scope mappings:', error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getTimetableList = async (req, res) => {
    try {
        const filters = req.query;
        const result = await timeTableServices.getTimetableListPrintData(filters);
        return SuccessResponse(res, 200, 'Timetable list fetched successfully', result);
    } catch (error) {
        console.error('Error in getting timetable list:', error);
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
        const result = await academicGroupScopeService.getCascadingGroupRoutinesService({
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


export const getGroupRoutinesWrappedInStructure = async (req, res) => {
    try {
        const { academicGroupId, sessionId } = req.query;
        const result = await academicGroupScopeService.getGroupRoutinesWrappedInStructureService({
            academicGroupId,
            sessionId,
        });
        return SuccessResponse(res, 200, 'Group routines wrapped in structure fetched successfully', result);
    } catch (error) {
        console.error('Error in getting group routines wrapped in structure:', error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};

export const getSubjectOptions = async (req, res) => {
    try {
        const { classSectionTermId, academicGroupId } = req.query;
        const result = await academicGroupScopeService.getSubjectOptionsService({
            classSectionTermId,
            academicGroupId,
        });
        return SuccessResponse(res, 200, 'Subject options fetched successfully', result);
    } catch (error) {
        console.error('Error in getting subject options:', error);
        return ErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
};



export const getProgramsOverview = async (req, res) => {
    try {
        const data = await timeTableServices.getProgramsOverviewData(req.query, req.requestContext);

        return res.status(200).json({
            success: true,
            message: 'Programs overview fetched successfully.',
            data,
        });
    } catch (error) {
        console.error("Error in getProgramsOverview:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
