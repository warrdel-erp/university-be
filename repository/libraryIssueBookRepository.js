import * as model from '../models/index.js'

const issueBookListAttributes = [
    'libraryIssueBookId',
    'libraryAddItemId',
    'libraryBookId',
    'libraryMemberId',
    'issueDate',
    'dueDate',
    'returnDate',
    'status',
    'issuedBy',
    'receivedBy',
    'createdBy',
];

const issueBookListIncludes = (universityId) => [
    {
        model: model.userModel,
        as: 'userBookIssue',
        attributes: ['userId', 'userName'],
        where: { universityId },
    },
    {
        model: model.libraryMemberModel,
        as: 'memberBookIssue',
        required: false,
        attributes: [
            'libraryMemberId',
            'memberId',
            'memberType',
            'studentId',
            'employeeId',
        ],
        include: [
            {
                model: model.studentModel,
                as: 'libraryMemberStudent',
                required: false,
                attributes: ['studentId', 'userId', 'firstName', 'middleName', 'lastName'],
            },
            {
                model: model.employeeModel,
                as: 'libraryMemberEmployee',
                required: false,
                attributes: ['employeeId', 'userId', 'employeeName'],
            },
        ],
    },
    {
        model: model.libraryAddItemModel,
        as: 'addItemBookIssue',
        required: false,
        attributes: ['libraryAddItemId', 'name', 'author', 'publisher'],
    },
    {
        model: model.libraryBookModel,
        as: 'libraryBookIssue',
        required: false,
        attributes: ['libraryBookId', 'title', 'authors', 'publisher'],
    },
];

const findIssueBookList = (where, universityId) =>
    model.libraryIssueBookModel.findAll({
        attributes: issueBookListAttributes,
        where,
        include: issueBookListIncludes(universityId),
    });

export async function findIssueBookById(libraryIssueBookId, universityId) {
    const rows = await findIssueBookList({ libraryIssueBookId }, universityId);
    return rows[0] ?? null;
}

export async function bookIssue(bookIssue, transaction) {
    return model.libraryIssueBookModel.create(bookIssue, { transaction });
}

export async function getAllIssueBooks(universityId) {
    return findIssueBookList(undefined, universityId);
}

export async function getBookByMemberId(libraryMemberId, universityId) {
    return findIssueBookList({ libraryMemberId }, universityId);
}

export async function countIssuesByMemberId(libraryMemberId) {
    return model.libraryIssueBookModel.count({
        where: { libraryMemberId },
    });
}

export async function deleteBook(libraryIssueBookId) {
    const deleted = await model.libraryIssueBookModel.destroy({
        where: { libraryIssueBookId },
    });
    return deleted > 0;
}

export async function updateBookAndStatus(libraryIssueBookId, bookIssue, transaction) {
    const [affectedCount] = await model.libraryIssueBookModel.update(bookIssue, {
        where: { libraryIssueBookId },
        transaction,
    });
    return affectedCount > 0;
}
