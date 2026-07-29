import * as academicGroupService from '../services/academicGroupService.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

function statusFromError(error) {
    if (/not found|already|required|exceed|allowed|exists/i.test(error.message)) {
        return 400;
    }
    return 500;
}

export async function createScope(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await academicGroupService.createScope(req.body, createdBy, updatedBy);
        return SuccessResponse(res, 201, 'Academic group scope created successfully', result);
    } catch (error) {
        console.error('Error in createScope:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function getScopeSingle(req, res) {
    try {
        const { academicGroupScopeId } = req.query;
        const result = await academicGroupService.getScopeById(academicGroupScopeId);
        if (!result) {
            return ErrorResponse(res, 404, 'Academic group scope not found');
        }
        return SuccessResponse(res, 200, 'Academic group scope fetched successfully', result);
    } catch (error) {
        console.error('Error in getScopeSingle:', error);
        return ErrorResponse(res, 500, 'Internal Server Error', error.message);
    }
}

export async function getAllScopes(req, res) {
    try {
        const result = await academicGroupService.getAllScopes(req.query);
        return SuccessResponse(res, 200, 'Academic group scopes fetched successfully', result);
    } catch (error) {
        console.error('Error in getAllScopes:', error);
        return ErrorResponse(res, 500, 'Internal Server Error', error.message);
    }
}

export async function updateScope(req, res) {
    try {
        const { academicGroupScopeId } = req.body;
        const updatedBy = req.user.userId;
        const updated = await academicGroupService.updateScope(
            academicGroupScopeId,
            req.body,
            updatedBy,
        );
        if (!updated) {
            return ErrorResponse(res, 404, 'Academic group scope not found');
        }
        return SuccessResponse(res, 200, 'Academic group scope updated successfully');
    } catch (error) {
        console.error('Error in updateScope:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function deleteScope(req, res) {
    try {
        const { academicGroupScopeId } = req.query;
        const updatedBy = req.user.userId;
        const deleted = await academicGroupService.deleteScope(academicGroupScopeId, updatedBy);
        if (!deleted) {
            return ErrorResponse(res, 404, 'Academic group scope not found');
        }
        return SuccessResponse(res, 200, `Delete successful for academicGroupScopeId ${academicGroupScopeId}`);
    } catch (error) {
        console.error('Error in deleteScope:', error);
        return ErrorResponse(res, 500, 'Internal Server Error', error.message);
    }
}

export async function createGroup(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await academicGroupService.createGroup(req.body, createdBy, updatedBy);
        return SuccessResponse(res, 201, 'Academic group created successfully', result);
    } catch (error) {
        console.error('Error in createGroup:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function getAllGroups(req, res) {
    try {
        const result = await academicGroupService.getAllGroups(req.query);
        return SuccessResponse(res, 200, 'Academic groups fetched successfully', result);
    } catch (error) {
        console.error('Error in getAllGroups:', error);
        return ErrorResponse(res, 500, 'Internal Server Error', error.message);
    }
}

export async function getGroupSingle(req, res) {
    try {
        const { academicGroupId } = req.query;
        const result = await academicGroupService.getGroupById(academicGroupId);
        if (!result) {
            return ErrorResponse(res, 404, 'Academic group not found');
        }
        return SuccessResponse(res, 200, 'Academic group fetched successfully', result);
    } catch (error) {
        console.error('Error in getGroupSingle:', error);
        return ErrorResponse(res, 500, 'Internal Server Error', error.message);
    }
}

export async function updateGroup(req, res) {
    try {
        const { academicGroupId } = req.body;
        const updatedBy = req.user.userId;
        const updated = await academicGroupService.updateGroup(
            academicGroupId,
            req.body,
            updatedBy,
        );
        if (!updated) {
            return ErrorResponse(res, 404, 'Academic group not found');
        }
        return SuccessResponse(res, 200, 'Academic group updated successfully');
    } catch (error) {
        console.error('Error in updateGroup:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function publishGroup(req, res) {
    try {
        const { academicGroupId } = req.query;
        const updatedBy = req.user.userId;
        const updated = await academicGroupService.publishGroup(academicGroupId, updatedBy);
        if (!updated) {
            return ErrorResponse(res, 404, 'Academic group not found');
        }
        return SuccessResponse(res, 200, 'Academic group published successfully');
    } catch (error) {
        console.error('Error in publishGroup:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function deleteGroup(req, res) {
    try {
        const { academicGroupId } = req.query;
        const updatedBy = req.user.userId;
        const deleted = await academicGroupService.deleteGroup(academicGroupId, updatedBy);
        if (!deleted) {
            return ErrorResponse(res, 404, 'Academic group not found');
        }
        return SuccessResponse(res, 200, `Delete successful for academicGroupId ${academicGroupId}`);
    } catch (error) {
        console.error('Error in deleteGroup:', error);
        return ErrorResponse(res, 500, 'Internal Server Error', error.message);
    }
}

export async function addUsers(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await academicGroupService.addUsers(req.body, createdBy, updatedBy);
        return SuccessResponse(res, 201, 'Academic group users added successfully', result);
    } catch (error) {
        console.error('Error in addUsers:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function getGroupUsers(req, res) {
    try {
        const { academicGroupId } = req.query;
        const result = await academicGroupService.getGroupUsers(academicGroupId);
        return SuccessResponse(res, 200, 'Academic group faculty fetched successfully', result);
    } catch (error) {
        console.error('Error in getGroupUsers:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function updateUser(req, res) {
    try {
        const { academicGroupUserId } = req.body;
        const updatedBy = req.user.userId;
        const updated = await academicGroupService.updateUser(
            academicGroupUserId,
            req.body,
            updatedBy,
        );
        if (!updated) {
            return ErrorResponse(res, 404, 'Academic group user not found');
        }
        return SuccessResponse(res, 200, 'Academic group user updated successfully');
    } catch (error) {
        console.error('Error in updateUser:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function deleteUsers(req, res) {
    try {
        const updatedBy = req.user.userId;
        const deleted = await academicGroupService.deleteUsers(req.body, updatedBy);
        if (!deleted) {
            return ErrorResponse(res, 404, 'Academic group user not found');
        }
        return SuccessResponse(res, 200, 'Academic group user deleted successfully');
    } catch (error) {
        console.error('Error in deleteUsers:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function addStudents(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await academicGroupService.addStudents(req.body, createdBy, updatedBy);
        return SuccessResponse(res, 201, 'Academic group students added successfully', result);
    } catch (error) {
        console.error('Error in addStudents:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function getAvailableStudents(req, res) {
    try {
        const { academicGroupId, ...filters } = req.query;
        const result = await academicGroupService.getAvailableStudents(academicGroupId, filters);
        return SuccessResponse(res, 200, 'Available students fetched successfully', result);
    } catch (error) {
        console.error('Error in getAvailableStudents:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function getAvailableUsers(req, res) {
    try {
        const { academicGroupId, ...filters } = req.query;
        const result = await academicGroupService.getAvailableUsers(academicGroupId, filters);
        return SuccessResponse(res, 200, 'Available users fetched successfully', result);
    } catch (error) {
        console.error('Error in getAvailableUsers:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}

export async function deleteStudents(req, res) {
    try {
        const updatedBy = req.user.userId;
        const deleted = await academicGroupService.deleteStudents(req.body, updatedBy);
        if (!deleted) {
            return ErrorResponse(res, 404, 'Academic group student not found');
        }
        return SuccessResponse(res, 200, 'Academic group student deleted successfully');
    } catch (error) {
        console.error('Error in deleteStudents:', error);
        return ErrorResponse(res, statusFromError(error), error.message || 'Internal Server Error');
    }
}
