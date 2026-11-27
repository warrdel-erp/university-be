import * as model from "../../../models/index.js";
import { scoped } from "../../../utility/scoped.js";

const excludeMeta = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

function parentBodyInclude() {
    return {
        model: model.governanceBodyModel,
        as: 'parentBody',
        attributes: ['governanceBodyId', 'name', 'code', 'category', 'status'],
        required: false,
    };
}

export async function createGovernanceBody(data, options = {}) {
    return scoped(model.governanceBodyModel).create(data, {
        transaction: options.transaction,
    });
}

export async function getAllGovernanceBodies(options = {}) {
    return scoped(model.governanceBodyModel).findAll({
        attributes: { exclude: excludeMeta },
        include: [parentBodyInclude()],
        order: [['name', 'ASC']],
        transaction: options.transaction,
    });
}

export async function getGovernanceBodyById(governanceBodyId, options = {}) {
    return scoped(model.governanceBodyModel).findOne({
        where: { governanceBodyId },
        attributes: { exclude: excludeMeta },
        include: [parentBodyInclude()],
        transaction: options.transaction,
    });
}

export async function updateGovernanceBody(governanceBodyId, data, options = {}) {
    const existing = await scoped(model.governanceBodyModel).findOne({
        where: { governanceBodyId },
        attributes: ['governanceBodyId'],
        transaction: options.transaction,
    });
    if (!existing) {
        return null;
    }

    await scoped(model.governanceBodyModel).update(data, {
        where: { governanceBodyId },
        individualHooks: true,
        transaction: options.transaction,
    });

    return getGovernanceBodyById(governanceBodyId, options);
}

export async function countChildGovernanceBodies(governanceBodyId, options = {}) {
    return scoped(model.governanceBodyModel).count({
        where: { parentBodyId: governanceBodyId },
        transaction: options.transaction,
    });
}

export async function deleteGovernanceBody(governanceBodyId, options = {}) {
    const existing = await scoped(model.governanceBodyModel).findOne({
        where: { governanceBodyId },
        attributes: ['governanceBodyId'],
        transaction: options.transaction,
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.governanceBodyModel).destroy({
        where: { governanceBodyId },
        individualHooks: true,
        transaction: options.transaction,
    });
    return deleted > 0;
}
