import * as libraryMemberService  from "../repository/libraryMemberRepository.js";
import * as libraryIssueBook  from "../repository/libraryIssueBookRepository.js";
import moment from "moment";

export async function addMember(memberData, createdBy, updatedBy) {
    try {

        const staticPrefix = "ASA-L1";

        const typePrefix = memberData.memberType.slice(0, 3).toUpperCase();

        const last = await libraryMemberService.getPreviousMemberId();
        const lastMemberId = last ? last.dataValues.member_id : "";

        let newMemberId;

        if (lastMemberId) {
            const lastNumber = parseInt(lastMemberId.split("-")[3]) || 0;
            const incrementedNumber = lastNumber + 1;

            newMemberId = `${staticPrefix}-${typePrefix}-${String(incrementedNumber).padStart(5, "0")}`;
        } else {
            newMemberId = `${staticPrefix}-${typePrefix}-00001`;
        }

        memberData.memberId = newMemberId;
        memberData.createdBy = createdBy;
        memberData.updatedBy = updatedBy;

        return await libraryMemberService.addMember(memberData);

    } catch (error) {
        console.error("Error adding member:", error);
        throw new Error("Unable to add member");
    }
};

export async function getMemberDetails(universityId) {
    return await libraryMemberService.getMemberDetails(universityId);
}

export async function getSingleMemberDetails(libraryCreationId,universityId) {
    return await libraryMemberService.getSingleMemberDetails(libraryCreationId,universityId);
}

export async function deleteMember(libraryMemberId) {
    return await libraryMemberService.deleteMember(libraryMemberId);
}

export async function updateMember(libraryMemberId, memberData, updatedBy) {    
    try {
        
        const libraryMember = await libraryMemberService.getPreviousMemberIdByLibraryMemberId(libraryMemberId);
        
        const lastMemberId = libraryMember ? libraryMember.dataValues.member_id : '';

        if (lastMemberId) {
            const newPrefix = memberData.memberType.slice(0, 2).toUpperCase();
            const numericPart = lastMemberId.slice(2);
            const updatedMemberId = `${newPrefix}${numericPart}`;

            memberData.memberId = updatedMemberId;
        }

        memberData.updatedBy = updatedBy;
        const result = await libraryMemberService.updateMember(libraryMemberId, memberData);
        return result;
    } catch (error) {
        console.error(`Error updating member:`, error);
        throw error;
    }
};

// Book Issue

export async function bookIssue(bookIssue, createdBy, updatedBy) {
    try {

        bookIssue.createdBy = createdBy;
        bookIssue.updatedBy = updatedBy;
        bookIssue.issueDate =  moment().toDate();

        const bookDetails = await libraryIssueBook.bookIssue(bookIssue);
        return bookDetails;
    } catch (error) {
        console.error('Error Book Issue:', error);
        throw new Error('Unable to add member');
    }
}

export async function getAllIssueBooks(universityId) {
    return await libraryIssueBook.getAllIssueBooks(universityId);
}

export async function getBookByMemberId(libraryMemberId,universityId) {
    return await libraryIssueBook.getBookByMemberId(libraryMemberId,universityId);
}

export async function deleteBook(libraryIssueBookId) {
    return await libraryIssueBook.deleteBook(libraryIssueBookId);
}

export async function updateBookAndStatus(libraryIssueBookId, bookIssue, updatedBy) {    
    try {

        bookIssue.updatedBy = updatedBy;
        bookIssue.returnDate =  moment().toDate();

        const bookDetails = await libraryIssueBook.updateBookAndStatus(libraryIssueBookId,bookIssue);
        return bookDetails;
    } catch (error) {
        console.error('Error Book Issue:', error);
        throw new Error('Unable to add member');
    }
};