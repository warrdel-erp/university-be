import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';
import sequelize from '../database/sequelizeConfig.js';
import { Op } from 'sequelize';

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
        model: model.departmentModel,
        as: 'department',
        attributes: { exclude: excludeMeta },
        required: false,
        include: [
            {
                model: model.departmentStructureModel,
                as: 'departmentStructures',
                attributes: { exclude: excludeMeta },
                required: false,
                include: [
                    {
                        model: model.departmentModel,
                        as: 'parentDepartment',
                        attributes: { exclude: excludeMeta },
                        required: false,
                    },
                ],
            },
        ],
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

const GROWTH_DAYS = 7;

function calculateGrowthPercent(currentCount, previousCount) {
    if (previousCount === 0) {
        if (currentCount > 0) {
            return 100;
        }
        return 0;
    }
    return Math.round(((currentCount - previousCount) / previousCount) * 1000) / 10;
}

function growthCutoffDate() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - GROWTH_DAYS);
    return cutoff;
}

async function countPositions(where = {}) {
    return scoped(model.orgPositionModel).count({ where });
}

async function countPositionsCreatedBy(cutoff, where = {}) {
    return scoped(model.orgPositionModel).count({
        where: {
            ...where,
            createdAt: { [Op.lte]: cutoff },
        },
    });
}

export async function getOrgCardsStats() {
    const cutoff = growthCutoffDate();

    const [
        totalPositions,
        filledPositions,
        vacantPositions,
        previousTotal,
        previousFilled,
        previousVacant,
        departments,
        levelRows,
    ] = await Promise.all([
        countPositions(),
        countPositions({ isVacant: false }),
        countPositions({ isVacant: true }),
        countPositionsCreatedBy(cutoff),
        countPositionsCreatedBy(cutoff, { isVacant: false }),
        countPositionsCreatedBy(cutoff, { isVacant: true }),
        scoped(model.departmentModel).count(),
        scoped(model.orgPositionModel).findAll({
            attributes: ['level'],
            group: ['level'],
            raw: true,
        }),
    ]);

    const reportingLevels = levelRows.length;

    return {
        totalPositions: {
            count: totalPositions,
            changePercent: calculateGrowthPercent(totalPositions, previousTotal),
        },
        filledPositions: {
            count: filledPositions,
            changePercent: calculateGrowthPercent(filledPositions, previousFilled),
        },
        vacantPositions: {
            count: vacantPositions,
            changePercent: calculateGrowthPercent(vacantPositions, previousVacant),
        },
        departments: {
            count: departments,
            changePercent: null,
        },
        reportingLevels: {
            count: reportingLevels,
            changePercent: null,
        },
    };
}

export async function getOrgPositions(filters = {}) {
    const where = {};
    if (filters.departmentStructureId != null) {
        where['$department.departmentStructures.departmentStructureId$'] = Number(filters.departmentStructureId);
    }
    if (filters.departmentId != null) {
        where.departmentId = Number(filters.departmentId);
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

export async function departmentExists(departmentId) {
    return scoped(model.departmentModel).findOne({
        attributes: ['departmentId'],
        where: { departmentId: Number(departmentId) },
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

export async function getOrgTreeData() {
    // 1. Fetch active institute info
    const institute = await scoped(model.instituteModel).findOne({
        attributes: ['instituteId', 'instituteName'],
        raw: true
    });

    // 2. Fetch all departments under active institute
    const departments = await scoped(model.departmentModel).findAll({
        attributes: ['departmentId', 'departmentName', 'departmentCode', 'departmentType'],
        raw: true
    });

    // 3. Fetch all structures under active institute
    const structures = await scoped(model.departmentStructureModel).findAll({
        attributes: ['departmentStructureId', 'departmentId', 'parentDepartmentId'],
        raw: true
    });

    // 4. Fetch all positions under active institute
    const positions = await scoped(model.orgPositionModel).findAll({
        attributes: ['orgPositionId', 'positionName', 'positionCode', 'level', 'employmentCategory', 'isVacant', 'sortOrder', 'departmentId'],
        raw: true
    });

    // 5. Build tree mappings
    const deptMap = new Map();
    for (const dept of departments) {
        deptMap.set(dept.departmentId, {
            departmentId: dept.departmentId,
            departmentName: dept.departmentName,
            departmentCode: dept.departmentCode,
            departmentType: dept.departmentType,
            positions: [],
            childDepartments: []
        });
    }

    // Group positions by departmentId
    for (const pos of positions) {
        if (pos.departmentId && deptMap.has(pos.departmentId)) {
            deptMap.get(pos.departmentId).positions.push({
                orgPositionId: pos.orgPositionId,
                positionName: pos.positionName,
                positionCode: pos.positionCode,
                level: pos.level,
                employmentCategory: pos.employmentCategory,
                isVacant: pos.isVacant,
                sortOrder: pos.sortOrder
            });
        }
    }

    // Sort positions by level asc, then sortOrder asc
    for (const [_, deptObj] of deptMap) {
        deptObj.positions.sort((a, b) => {
            if (a.level !== b.level) {
                return a.level - b.level;
            }
            return (a.sortOrder || 0) - (b.sortOrder || 0);
        });
    }

    // Group structures by parentDepartmentId
    const parentToChildren = new Map();
    for (const struct of structures) {
        const parentId = struct.parentDepartmentId ? Number(struct.parentDepartmentId) : null;
        const childId = struct.departmentId ? Number(struct.departmentId) : null;
        if (childId) {
            if (!parentToChildren.has(parentId)) {
                parentToChildren.set(parentId, []);
            }
            parentToChildren.get(parentId).push(childId);
        }
    }

    // Recursive helper to build sub-department nodes
    function buildSubTree(parentId) {
        const childIds = parentToChildren.get(parentId) || [];
        const nodes = [];
        for (const childId of childIds) {
            const deptObj = deptMap.get(childId);
            if (deptObj) {
                nodes.push({
                    departmentId: deptObj.departmentId,
                    departmentName: deptObj.departmentName,
                    departmentCode: deptObj.departmentCode,
                    departmentType: deptObj.departmentType,
                    positions: deptObj.positions,
                    childDepartments: buildSubTree(childId)
                });
            }
        }
        return nodes;
    }

    // Get root departments (where parentDepartmentId is null or not in the structures map as a child)
    const rootDeptIds = parentToChildren.get(null) || [];
    const academicParents = [];
    const adminParents = [];

    for (const rootId of rootDeptIds) {
        const deptObj = deptMap.get(rootId);
        if (deptObj) {
            const node = {
                departmentId: deptObj.departmentId,
                departmentName: deptObj.departmentName,
                departmentCode: deptObj.departmentCode,
                departmentType: deptObj.departmentType,
                positions: deptObj.positions,
                childDepartments: buildSubTree(rootId)
            };
            if (deptObj.departmentType === 'Academic') {
                academicParents.push(node);
            } else {
                adminParents.push(node);
            }
        }
    }

    return {
        instituteId: institute ? institute.instituteId : null,
        instituteName: institute ? institute.instituteName : "University Institute",
        categories: [
            {
                name: "Academic Departments",
                type: "Academic",
                departments: academicParents
            },
            {
                name: "Administrative Departments",
                type: "Admin",
                departments: adminParents
            }
        ]
    };
}
