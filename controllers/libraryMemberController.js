import * as memberCreation from "../services/libraryMemberServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addMember(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const newMember = await memberCreation.addMember(req.body, createdBy, updatedBy);
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
        const { libraryMemberId } = req.body;
        const updatedBy = req.user.userId;
        const updatedMember = await memberCreation.updateMember(
            libraryMemberId,
            req.body,
            updatedBy,
        );
        return SuccessResponse(res, 200, "Member Creation update succesfully", updatedMember);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteMember(req, res) {
    try {
        const { libraryMemberId } = req.query;
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
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        const result = await memberCreation.bookIssue(
            req.body,
            createdBy,
            updatedBy,
            req.user.userName,
        );

        return SuccessResponse(res, 201, "book Issue Successfully", result);
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
        const books = await memberCreation.getBookByMemberId(libraryMemberId, universityId);
        return SuccessResponse(res, 200, "Issue Books", books ?? []);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateBookAndStatus(req, res) {
    try {
        const { libraryIssueBookId } = req.body;
        const updatedBy = req.user.userId;
        const updated = await memberCreation.updateBookAndStatus(
            libraryIssueBookId,
            req.body,
            updatedBy,
        );
        return SuccessResponse(res, 200, "Book update succesfully", updated);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteBook(req, res) {
    try {
        const { libraryIssueBookId } = req.query;
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