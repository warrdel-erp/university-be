import * as memberCreation  from  "../services/libraryMemberServices.js";
import { z } from "zod";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addMember(req, res) {
    const {libraryCreationId,memberType} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(libraryCreationId && memberType)){
           return ErrorResponse(res, 400, 'libraryCreationId and memberType is required')
        }
        const newMember = await memberCreation.addMember(req.body,createdBy,updatedBy);
        return SuccessResponse(res, 201, "Member Add Successfully", newMember);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getMemberDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const member = await memberCreation.getMemberDetails(universityId);
        return SuccessResponse(res, 200, "Member Details", member);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getSingleMemberDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { libraryCreationId } = req.query;

        const members = await memberCreation.getSingleMemberDetails(libraryCreationId, universityId);
        if (members?.length) {
            return SuccessResponse(res, 200, "Member Details", members);
        } else {
            return ErrorResponse(res, 404, "Member not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateMember(req, res) {
    try {
        const {libraryMemberId} = req.body
        if(!(libraryMemberId)){
            return ErrorResponse(res, 400, 'library Member Id is required')
         }
         const updatedBy = req.user.userId;
        const updatedMember = await memberCreation.updateMember(libraryMemberId, req.body,updatedBy);
            return SuccessResponse(res, 200, "Member Creation update succesfully", updatedMember);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteMember(req, res) {
    try {
        const { libraryMemberId } = req.query;
        if (!libraryMemberId) {
            return ErrorResponse(res, 400, "library Member Id is required");
        }
        const deleted = await memberCreation.deleteMember(libraryMemberId);
        if (deleted) {
            return SuccessResponse(res, 200, `Delete successful for Member creation ID ${libraryMemberId}`);
        } else {
            return ErrorResponse(res, 404, "Member not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

// book issue

export async function bookIssue(req, res) {
    const {libraryAddItemId,libraryMemberId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(libraryAddItemId && libraryMemberId)){
           return ErrorResponse(res, 400, 'libraryAddItemId and libraryMemberId is required')
        }
        const newMember = await memberCreation.bookIssue(req.body,createdBy,updatedBy);
        return SuccessResponse(res, 201, "book Issue Successfully", newMember);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getAllIssueBooks(req, res) {
    const universityId = req.user.universityId;
    try {
        const member = await memberCreation.getAllIssueBooks(universityId);
        return SuccessResponse(res, 200, "Issue Books", member);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getBookByMemberId(req, res) {
    const universityId = req.user.universityId;
    try {
        const { libraryMemberId } = req.query;
        const Member = await memberCreation.getBookByMemberId(libraryMemberId,universityId);
        if (Member) {
            return SuccessResponse(res, 200, "Issue Books", Member);
        } else {
            return ErrorResponse(res, 404, "Member not found");
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateBookAndStatus(req, res) {
    try {
        const {libraryIssueBookId} = req.body
        if(!(libraryIssueBookId)){
            return ErrorResponse(res, 400, 'libraryIssueBookId is required')
         }
         const updatedBy = req.user.userId;
        const updatedMember = await memberCreation.updateBookAndStatus(libraryIssueBookId, req.body,updatedBy);
            return SuccessResponse(res, 200, "Book update succesfully", updatedMember);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteBook(req, res) {
    try {
        const { libraryIssueBookId } = req.query;
        if (!libraryIssueBookId) {
            return ErrorResponse(res, 400, "libraryIssueBookId is required");
        }
        const deleted = await memberCreation.deleteBook(libraryIssueBookId);
        if (deleted) {
            return SuccessResponse(res, 200, `Delete successful for Member creation ID ${libraryIssueBookId}`);
        } else {
            return ErrorResponse(res, 404, "Book Issue not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}