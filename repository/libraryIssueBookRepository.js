import * as model from '../models/index.js';
import { Op } from 'sequelize';

function buildIssueBookWhere(filters = {}) {
    const conditions = [];

    if (filters.libraryCreationId) {
        conditions.push({ '$memberBookIssue.library_creation_id$': filters.libraryCreationId });
    }

    if (filters.search) {
        const term = filters.search.trim();
        const pattern = { [Op.like]: `%${term}%` };
        const orConditions = [
            { issuedBy: pattern },
            { receivedBy: pattern },
            { status: pattern },
            { '$libraryBookIssue.title$': pattern },
            { '$libraryBookIssue.authors$': pattern },
            { '$libraryBookIssue.isbn$': pattern },
            { '$libraryBookIssue.publisher$': pattern },
            { '$memberBookIssue.member_id$': pattern },
            { '$memberBookIssue.member_type$': pattern },
            { '$addItemBookIssue.name$': pattern },
            { '$addItemBookIssue.author$': pattern },
        ];

        const numericId = Number(term);
        if (term !== "" && !Number.isNaN(numericId)) {
            orConditions.push(
                { libraryIssueBookId: numericId },
                { libraryMemberId: numericId },
                { libraryBookId: numericId },
                { libraryAddItemId: numericId },
            );
        }

        conditions.push({ [Op.or]: orConditions });
    }

    if (!conditions.length) return {};
    return conditions.length === 1 ? conditions[0] : { [Op.and]: conditions };
}

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

export async function getAllIssueBooks(universityId, filters = {}, pagination = {}) {
    const { limit, offset } = pagination;
    const where = buildIssueBookWhere(filters);

    const { count, rows } = await model.libraryIssueBookModel.findAndCountAll({
        attributes: issueBookListAttributes,
        where,
        include: issueBookListIncludes(universityId),
        limit,
        offset,
        subQuery: false,
        distinct: true,
        col: 'library_issue_book_id',
        order: [['libraryIssueBookId', 'DESC']],
    });

    return { total: count, books: rows };
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
