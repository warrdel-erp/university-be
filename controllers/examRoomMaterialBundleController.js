import * as examRoomMaterialBundleService from "../services/examRoomMaterialBundleService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createBundle(req, res) {
    try {
        const { userId, universityId, defaultInstituteId, defaultAcademicYearId } = req.user;
        const { examDate, examinationSessionSlotId, classRoomSectionId, examRoomMaterialItems } = req.body;
        
        if (!examDate || !examinationSessionSlotId || !classRoomSectionId || !examRoomMaterialItems) {
            return ErrorResponse(res, 400, "Missing required parameters");
        }
        
        const bundleData = {
            examDate,
            examinationSessionSlotId,
            classRoomSectionId,
            universityId,
            instituteId: defaultInstituteId,
            academicYearId: defaultAcademicYearId,
            createdBy: userId,
            updatedBy: userId
        };
        
        const result = await examRoomMaterialBundleService.createBundle(bundleData, examRoomMaterialItems);
        return SuccessResponse(res, 201, "Material bundle created successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getBundleById(req, res) {
    try {
        const { examRoomMaterialBundleId } = req.query;
        const result = await examRoomMaterialBundleService.getBundleById(examRoomMaterialBundleId);
        if (!result) {
            return ErrorResponse(res, 404, "Material bundle not found");
        }
        return SuccessResponse(res, 200, "Material bundle fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateBundleStatus(req, res) {
    try {
        const { examRoomMaterialBundleId } = req.query;
        const { status, remarks, issuedTo } = req.body;
        
        if (!status) {
            return ErrorResponse(res, 400, "Missing status parameter");
        }
        
        const statusData = {
            status,
            remarks,
            issuedTo,
            user: req.user
        };
        
        const result = await examRoomMaterialBundleService.updateBundleStatus(examRoomMaterialBundleId, statusData);
        if (!result) {
            return ErrorResponse(res, 404, "Material bundle not found");
        }
        return SuccessResponse(res, 200, "Material bundle status updated successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}
