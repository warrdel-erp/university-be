import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function getPreviousMemberId() {
    try {
        const attribute = ["member_id"];
        const result = await model.libraryMemberModel.findOne({
            attributes: attribute,
            order: [['member_id', 'DESC']]
        });        
        return result;
    } catch (error) {
        console.error(`Error in getting memberId`, error);
        throw error;
    }
};

export async function addMember(memberData,transaction) {    
    try {
        const result = await model.libraryMemberModel.create(memberData,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add member :", error);
        throw error;
    }
};


function buildMemberWhere(filters = {}) {
    const conditions = [];

    if (filters.libraryCreationId) {
        conditions.push({ libraryCreationId: filters.libraryCreationId });
    }

    if (filters.search) {
        const term = filters.search.trim();
        const pattern = { [Op.like]: `%${term}%` };
        const orConditions = [
            { memberId: pattern },
            { memberType: pattern },
            { '$libraryMemberStudent.first_name$': pattern },
            { '$libraryMemberStudent.middle_name$': pattern },
            { '$libraryMemberStudent.last_name$': pattern },
            { '$libraryMemberStudent.scholar_number$': pattern },
            { '$libraryMemberEmployee.employee_name$': pattern },
        ];

        const numericId = Number(term);
        if (term !== "" && !Number.isNaN(numericId)) {
            orConditions.push(
                { libraryMemberId: numericId },
                { studentId: numericId },
                { employeeId: numericId },
            );
        }

        conditions.push({ [Op.or]: orConditions });
    }

    if (!conditions.length) return {};
    return conditions.length === 1 ? conditions[0] : { [Op.and]: conditions };
}

const memberListInclude = (universityId) => [
    {
        model: model.studentModel,
        as: "libraryMemberStudent",
        required: false,
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
    },
    {
        model: model.employeeModel,
        as: "libraryMemberEmployee",
        required: false,
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
    },
    {
        model: model.libraryCreationModel,
        as: "libraryMemberCreation",
        required: true,
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
        include: [
            {
                model: model.instituteModel,
                as: "libraryCreationInstitute",
                required: true,
                attributes: ["instituteId", "instituteName", "universityId"],
                where: { universityId },
            },
        ],
    },
];

export async function getMemberDetails(universityId, filters = {}, pagination = {}) {
    try {
        const { limit, offset } = pagination;
        const where = buildMemberWhere(filters);

        const { count, rows } = await model.libraryMemberModel.findAndCountAll({
            attributes: { exclude: ["createdAt", "updatedAt", "instituteId", "createdBy", "updatedBy"] },
            where,
            include: memberListInclude(universityId),
            limit,
            offset,
            subQuery: false,
            distinct: true,
            col: "library_member_id",
            order: [["libraryMemberId", "DESC"]],
        });

        return { total: count, members: rows };
    } catch (error) {
        console.error('Error fetching member details:', error);
        throw error;
    }
}


export async function getSingleMemberDetails(libraryCreationId, universityId) {
    try {
        const members = await model.libraryMemberModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "instituteId", "createdBy", "updatedBy"] },
            where: { libraryCreationId },
            include: [
                {
                    model: model.studentModel,
                    as: "libraryMemberStudent",
                    required: false,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
                {
                    model: model.employeeModel,
                    as: "libraryMemberEmployee",
                    required: false,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
                {
                    model: model.libraryCreationModel,
                    as: "libraryMemberCreation",
                    required: true,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                    include: [
                        {
                            model: model.instituteModel,
                            as: "libraryCreationInstitute",
                            required: true,
                            attributes: ["instituteId", "instituteName", "universityId"],
                            where: { universityId },
                        },
                    ],
                },
            ],
        });

        return members;
    } catch (error) {
        console.error(`Error fetching single member details: ${libraryCreationId}`, error);
        throw error;
    }
}

export async function deleteMember(libraryMemberId) {
    const deleted = await model.libraryMemberModel.destroy({ where: { libraryMemberId: libraryMemberId } });
    return deleted > 0;
}

export async function findMemberById(libraryMemberId, transaction) {
    return await model.libraryMemberModel.findByPk(libraryMemberId, { transaction });
}

export async function findByStudentId(studentId, excludeLibraryMemberId, transaction) {
    const where = { studentId };
    if (excludeLibraryMemberId) {
        where.libraryMemberId = { [Op.ne]: excludeLibraryMemberId };
    }
    return model.libraryMemberModel.findOne({
        attributes: ["libraryMemberId"],
        where,
        transaction,
    });
}

export async function findByEmployeeId(employeeId, excludeLibraryMemberId, transaction) {
    const where = { employeeId };
    if (excludeLibraryMemberId) {
        where.libraryMemberId = { [Op.ne]: excludeLibraryMemberId };
    }
    return model.libraryMemberModel.findOne({
        attributes: ["libraryMemberId"],
        where,
        transaction,
    });
}

export async function getPreviousMemberIdByLibraryMemberId(libraryMemberId) {
    try {
        const attribute = ["member_id"];
        const result = await model.libraryMemberModel.findOne({
            attributes: attribute,
            where: { libraryMemberId }
        });
        
        return result
    } catch (error) {
        console.error(`Error in getting memberId`, error);
        throw error;
    }
}

export async function updateMember(libraryMemberId, memberData, transaction) {
    try {
        const result = await model.libraryMemberModel.update(memberData, {
            where: { libraryMemberId },
            transaction
        });
        return result; 
    } catch (error) {
        console.error(`Error updating member creation ${libraryMemberId}:`, error);
        throw error; 
    }
}
