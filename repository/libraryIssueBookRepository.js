import * as model from '../models/index.js'

export async function bookIssue(bookIssue,transaction) {    
    try {
        const result = await model.libraryIssueBookModel.create(bookIssue,{transaction});
        return result;
    } catch (error) {
        console.error("Error in Book Issue:", error);
        throw error;
    }
};

export async function getAllIssueBooks(universityId) {
    try {
        const bookDetails = await model.libraryIssueBookModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","library_add_item_id","createdBy","updatedBy","library_member_id","library_issue_book_id"] },
            include: [
                {
                    model: model.userModel,
                    as: "userBookIssue",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.libraryMemberModel,
                    as: "memberBookIssue",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","student_id","employee_id","library_creation_id"] },
                    include:[
                        {
                            model: model.studentModel,
                            as: "libraryMemberStudent",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                        },
                        {
                            model: model.employeeModel,
                            as: "libraryMemberEmployee",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                        },
                    ]
                },
                {
                    model: model.libraryAddItemModel,
                    as: "addItemBookIssue",
                    attributes :["name","author","publisher"]
                }
            ]
        });

        return bookDetails;
    } catch (error) {
        console.error('Error fetching member details:', error);
        throw error;
    }
};

export async function getBookByMemberId(libraryMemberId,universityId) {
    try {
        const bookDetails = await model.libraryIssueBookModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"] },
            where: { libraryMemberId },
            include: [
                {
                    model: model.userModel,
                    as: "userBookIssue",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.libraryMemberModel,
                    as: "memberBookIssue",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","student_id","employee_id","library_creation_id"] },
                    include:[
                        {
                            model: model.studentModel,
                            as: "libraryMemberStudent",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                        },
                        {
                            model: model.employeeModel,
                            as: "libraryMemberEmployee",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                        },
                    ]
                },
                {
                    model: model.libraryAddItemModel,
                    as: "addItemBookIssue",
                    attributes :["name","author","publisher"]
                }
            ]
        });

        return bookDetails;
    } catch (error) {
        console.error(`Error fetching member details: ${libraryCreationId}`, error);
        throw error;
    }
};

export async function deleteBook(libraryIssueBookId) {
    const deleted = await model.libraryIssueBookModel.destroy({ where: { libraryIssueBookId: libraryIssueBookId } });
    return deleted > 0;
};

export async function updateBookAndStatus(libraryIssueBookId, bookIssue, transaction) {
    try {
        const result = await model.libraryIssueBookModel.update(bookIssue, {
            where: { libraryIssueBookId },
            transaction
        });
        return result; 
    } catch (error) {
        console.error(`Error updating member creation ${libraryIssueBookId}:`, error);
        throw error; 
    }
};