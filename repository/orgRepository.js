import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';
import sequelize from '../database/sequelizeConfig.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

const assigneeInclude = {
    model: model.userModel,
    as: 'assignee',
    attributes: ['userId', 'userName', 'email', 'phone', 'status'],
    include: [
        {
            model: model.employeeModel,
            as: 'employee',
            attributes: ['employeeId', 'employeeName', 'userId'],
            required: false,
        },
    ],
};

const positionListInclude = [
    {
        model: model.departmentStructureModel,
        as: 'departmentStructure',
        attributes: { exclude: excludeMeta },
        include: [
            {
                model: model.subAccountModel,
                as: 'subAccountDetails',
                attributes: { exclude: excludeMeta },
            },
        ],
    },
    {
        model: model.orgPositionModel,
        as: 'reportsToPosition',
        attributes: ['orgPositionId', 'positionName', 'positionCode'],
        required: false,
    },
    {
        model: model.orgPositionHeadModel,
        as: 'heads',
        attributes: { exclude: excludeMeta },
        required: false,
        include: [assigneeInclude],
    },
];

export async function addOrgPosition(data) {
    return scoped(model.orgPositionModel).create(data);
}

export async function getOrgPositions(filters = {}) {
    const where = {};
    if (filters.departmentStructureId != null) {
        where.departmentStructureId = Number(filters.departmentStructureId);
    }
    if (filters.employmentCategory) {
        where.employmentCategory = filters.employmentCategory;
    }
    if (filters.isVacant !== undefined && filters.isVacant !== null && filters.isVacant !== '') {
        where.isVacant = filters.isVacant === true || filters.isVacant === 'true';
    }

    return scoped(model.orgPositionModel).findAll({
        attributes: { exclude: excludeMeta },
        where,
        include: positionListInclude,
        order: [
            ['sortOrder', 'ASC'],
            ['orgPositionId', 'ASC'],
        ],
    });
}

export async function getOrgPositionById(orgPositionId) {
    return scoped(model.orgPositionModel).findOne({
        attributes: { exclude: excludeMeta },
        where: { orgPositionId: Number(orgPositionId) },
        include: positionListInclude,
    });
}

export async function updateOrgPosition(orgPositionId, data) {
    const [count] = await scoped(model.orgPositionModel).update(data, {
        where: { orgPositionId: Number(orgPositionId) },
    });
    return count > 0;
}

export async function deleteOrgPosition(orgPositionId) {
    const positionId = Number(orgPositionId);
    const transaction = await sequelize.transaction();
    try {
        await scoped(model.orgPositionHeadModel).destroy({
            where: { orgPositionId: positionId },
            transaction,
        });
        const deleted = await scoped(model.orgPositionModel).destroy({
            where: { orgPositionId: positionId },
            transaction,
        });
        await transaction.commit();
        return deleted > 0;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function countActiveHeads(orgPositionId, transaction) {
    return scoped(model.orgPositionHeadModel).count({
        where: {
            orgPositionId: Number(orgPositionId),
            status: 'ACTIVE',
        },
        transaction,
    });
}

export async function setPositionVacant(orgPositionId, isVacant, updatedBy, transaction) {
    await scoped(model.orgPositionModel).update(
        { isVacant, updatedBy },
        {
            where: { orgPositionId: Number(orgPositionId) },
            transaction,
        },
    );
}

export async function markPositionVacant(orgPositionId, updatedBy) {
    const positionId = Number(orgPositionId);
    const transaction = await sequelize.transaction();
    try {
        await scoped(model.orgPositionHeadModel).update(
            { status: 'INACTIVE', updatedBy },
            {
                where: {
                    orgPositionId: positionId,
                    status: 'ACTIVE',
                },
                transaction,
            },
        );
        await setPositionVacant(positionId, true, updatedBy, transaction);
        await transaction.commit();
        return getOrgPositionById(positionId);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function findActiveHead(orgPositionId, userId) {
    return scoped(model.orgPositionHeadModel).findOne({
        attributes: { exclude: excludeMeta },
        where: {
            orgPositionId: Number(orgPositionId),
            userId: Number(userId),
            status: 'ACTIVE',
        },
    });
}

export async function addHead(data) {
    const transaction = await sequelize.transaction();
    try {
        const head = await scoped(model.orgPositionHeadModel).create(data, { transaction });
        if (data.status === 'ACTIVE') {
            await setPositionVacant(data.orgPositionId, false, data.updatedBy, transaction);
        }
        await transaction.commit();
        return head;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getHeadsByPositionId(orgPositionId) {
    return scoped(model.orgPositionHeadModel).findAll({
        attributes: { exclude: excludeMeta },
        where: { orgPositionId: Number(orgPositionId) },
        include: [assigneeInclude],
        order: [['orgPositionHeadId', 'ASC']],
    });
}

export async function getHeadById(orgPositionHeadId) {
    return scoped(model.orgPositionHeadModel).findOne({
        attributes: { exclude: excludeMeta },
        where: { orgPositionHeadId: Number(orgPositionHeadId) },
        include: [assigneeInclude],
    });
}

export async function updateHead(orgPositionHeadId, data, updatedBy) {
    const headId = Number(orgPositionHeadId);
    const transaction = await sequelize.transaction();
    try {
        const existing = await scoped(model.orgPositionHeadModel).findOne({
            where: { orgPositionHeadId: headId },
            transaction,
        });
        if (!existing) {
            await transaction.rollback();
            return null;
        }

        const [count] = await scoped(model.orgPositionHeadModel).update(
            { ...data, updatedBy },
            {
                where: { orgPositionHeadId: headId },
                transaction,
            },
        );
        if (count === 0) {
            await transaction.rollback();
            return null;
        }

        const activeCount = await countActiveHeads(existing.orgPositionId, transaction);
        await setPositionVacant(existing.orgPositionId, activeCount === 0, updatedBy, transaction);
        await transaction.commit();
        return getHeadById(headId);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function deleteHead(orgPositionHeadId, updatedBy) {
    const headId = Number(orgPositionHeadId);
    const transaction = await sequelize.transaction();
    try {
        const existing = await scoped(model.orgPositionHeadModel).findOne({
            where: { orgPositionHeadId: headId },
            transaction,
        });
        if (!existing) {
            await transaction.rollback();
            return false;
        }

        const deleted = await scoped(model.orgPositionHeadModel).destroy({
            where: { orgPositionHeadId: headId },
            transaction,
        });
        if (deleted === 0) {
            await transaction.rollback();
            return false;
        }

        const activeCount = await countActiveHeads(existing.orgPositionId, transaction);
        await setPositionVacant(existing.orgPositionId, activeCount === 0, updatedBy, transaction);
        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function departmentStructureExists(departmentStructureId) {
    return scoped(model.departmentStructureModel).findOne({
        attributes: ['departmentStructureId'],
        where: { departmentStructureId: Number(departmentStructureId) },
    });
}

export async function positionExists(orgPositionId) {
    return scoped(model.orgPositionModel).findOne({
        attributes: ['orgPositionId'],
        where: { orgPositionId: Number(orgPositionId) },
    });
}

export async function userExists(userId) {
    const where = { userId: Number(userId) };
    const store = requestContext.getStore();
    if (store?.universityId) {
        where.universityId = store.universityId;
    }
    return model.userModel.findOne({
        attributes: ['userId'],
        where,
    });
}
