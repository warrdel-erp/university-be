import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

function parentBodyInclude() {
    return {
        model: model.governanceBodyModel,
        as: 'parentBody',
        attributes: ['governanceBodyId', 'name', 'code', 'category', 'status'],
        required: false,
    };
}

export async function createGovernanceBody(data) {
    return scoped(model.governanceBodyModel).create(data);
}

export async function getAllGovernanceBodies() {
    return scoped(model.governanceBodyModel).findAll({
        attributes: { exclude: excludeMeta },
        include: [parentBodyInclude()],
        order: [['name', 'ASC']],
    });
}

export async function getGovernanceBodyById(governanceBodyId) {
    return scoped(model.governanceBodyModel).findOne({
        where: { governanceBodyId },
        attributes: { exclude: excludeMeta },
        include: [parentBodyInclude()],
    });
}

export async function updateGovernanceBody(governanceBodyId, data) {
    const existing = await scoped(model.governanceBodyModel).findOne({
        where: { governanceBodyId },
        attributes: ['governanceBodyId'],
    });
    if (!existing) {
        return null;
    }

    await scoped(model.governanceBodyModel).update(data, {
        where: { governanceBodyId },
    });

    return getGovernanceBodyById(governanceBodyId);
}

export async function countChildGovernanceBodies(governanceBodyId) {
    return scoped(model.governanceBodyModel).count({
        where: { parentBodyId: governanceBodyId },
    });
}

export async function deleteGovernanceBody(governanceBodyId) {
    const existing = await scoped(model.governanceBodyModel).findOne({
        where: { governanceBodyId },
        attributes: ['governanceBodyId'],
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.governanceBodyModel).destroy({
        where: { governanceBodyId },
    });
    return deleted > 0;
}
