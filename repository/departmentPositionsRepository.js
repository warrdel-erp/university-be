import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';
import sequelize from '../database/sequelizeConfig.js';
import { Op } from 'sequelize';
import {
    decimalSubtract,
    decimalDivide,
    decimalMultiply,
    decimalMax,
} from '../utility/decimalMoney.js';

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
                model: model.departmentModel,
                as: 'parentDepartment',
                attributes: ['departmentId', 'departmentName', 'departmentCode', 'departmentType'],
                required: false,
            },
        ],
    },
    {
        model: model.userDepartmentPositionsModel,
        as: 'heads',
        attributes: { exclude: excludeMeta },
        where: { status: 'ACTIVE' },
        required: false,
        include: [assigneeInclude],
    },
];

export async function addOrgPosition(data) {
    const transaction = await sequelize.transaction();
    try {
        let isLevelHead = data.isLevelHead === true;

        if (data.departmentId != null) {
            const sameLevelCount = await countPositionsAtLevel(
                data.departmentId,
                data.level,
                null,
                transaction,
            );
            if (sameLevelCount === 0) {
                isLevelHead = true;
            }
        }

        if (isLevelHead && data.departmentId != null) {
            await clearLevelHeadFlag(
                data.departmentId,
                data.level,
                null,
                data.updatedBy,
                transaction,
            );
        }

        const position = await scoped(model.departmentPositionsModel).create(
            { ...data, isLevelHead },
            { transaction },
        );
        await transaction.commit();
        return getOrgPositionById(position.departmentPositionId);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function countPositionsAtLevel(departmentId, level, excludePositionId, transaction) {
    const where = {
        departmentId: Number(departmentId),
        level: Number(level),
    };
    if (excludePositionId != null) {
        where.departmentPositionId = { [Op.ne]: Number(excludePositionId) };
    }

    return scoped(model.departmentPositionsModel).count({ where, transaction });
}

export async function clearLevelHeadFlag(departmentId, level, excludePositionId, updatedBy, transaction) {
    const where = {
        departmentId: Number(departmentId),
        level: Number(level),
        isLevelHead: true,
    };
    if (excludePositionId != null) {
        where.departmentPositionId = { [Op.ne]: Number(excludePositionId) };
    }

    await scoped(model.departmentPositionsModel).update(
        { isLevelHead: false, updatedBy },
        { where, transaction },
    );
}

export async function ensureSolePositionIsLevelHead(departmentId, level, updatedBy, transaction) {
    if (departmentId == null) {
        return;
    }

    const positions = await scoped(model.departmentPositionsModel).findAll({
        attributes: ['departmentPositionId', 'isLevelHead'],
        where: {
            departmentId: Number(departmentId),
            level: Number(level),
        },
        order: [['departmentPositionId', 'ASC']],
        transaction,
    });

    if (positions.length === 0) {
        return;
    }

    if (positions.length === 1) {
        if (!positions[0].isLevelHead) {
            await scoped(model.departmentPositionsModel).update(
                { isLevelHead: true, updatedBy },
                {
                    where: { departmentPositionId: positions[0].departmentPositionId },
                    transaction,
                },
            );
        }
        return;
    }

    let hasLevelHead = false;
    for (const position of positions) {
        if (position.isLevelHead) {
            hasLevelHead = true;
            break;
        }
    }

    if (!hasLevelHead) {
        await scoped(model.departmentPositionsModel).update(
            { isLevelHead: true, updatedBy },
            {
                where: { departmentPositionId: positions[0].departmentPositionId },
                transaction,
            },
        );
        await clearLevelHeadFlag(
            departmentId,
            level,
            positions[0].departmentPositionId,
            updatedBy,
            transaction,
        );
    }
}

const GROWTH_DAYS = 7;

const CHANGE_PERIODS = new Set(['week', 'month', 'year']);

function resolveChangePeriod(changePeriod) {
    if (changePeriod && CHANGE_PERIODS.has(changePeriod)) {
        return changePeriod;
    }
    return 'week';
}

function calculateGrowthPercent(currentCount, previousCount) {
    if (previousCount === 0) {
        return currentCount > 0 ? 100 : 0;
    }

    const delta = decimalSubtract(currentCount, previousCount);
    const ratio = decimalDivide(delta, previousCount);
    const percent = decimalMultiply(ratio, 100);
    return decimalMax(percent, 0);
}

function growthCutoffDate(changePeriod) {
    const cutoff = new Date();
    const period = resolveChangePeriod(changePeriod);

    if (period === 'year') {
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        return cutoff;
    }

    if (period === 'month') {
        cutoff.setMonth(cutoff.getMonth() - 1);
        return cutoff;
    }

    cutoff.setDate(cutoff.getDate() - GROWTH_DAYS);
    return cutoff;
}

async function countPositions(where = {}) {
    return scoped(model.departmentPositionsModel).count({ where });
}

async function countFilledPositions(where = {}) {
    return scoped(model.departmentPositionsModel).count({
        where,
        include: [
            {
                model: model.userDepartmentPositionsModel,
                as: 'heads',
                required: true,
                where: { status: 'ACTIVE' },
                attributes: [],
            },
        ],
        distinct: true,
        col: 'departmentPositionId',
    });
}

async function countPositionsCreatedBy(cutoff, where = {}) {
    return scoped(model.departmentPositionsModel).count({
        where: {
            ...where,
            createdAt: { [Op.lte]: cutoff },
        },
    });
}

async function countFilledPositionsCreatedBy(cutoff) {
    return countFilledPositions({
        createdAt: { [Op.lte]: cutoff },
    });
}

async function countDepartmentsCreatedBy(cutoff) {
    return scoped(model.departmentModel).count({
        where: {
            createdAt: { [Op.lte]: cutoff },
        },
    });
}

async function countReportingLevelsCreatedBy(cutoff) {
    const rows = await scoped(model.departmentPositionsModel).findAll({
        attributes: ['level'],
        where: {
            createdAt: { [Op.lte]: cutoff },
        },
        group: ['level'],
        raw: true,
    });
    return rows.length;
}

export async function getOrgCardsStats(changePeriod) {
    const period = resolveChangePeriod(changePeriod);
    const cutoff = growthCutoffDate(period);

    const [
        totalPositions,
        filledPositions,
        previousTotal,
        previousFilled,
        departments,
        previousDepartments,
        levelRows,
        previousReportingLevels,
    ] = await Promise.all([
        countPositions(),
        countFilledPositions(),
        countPositionsCreatedBy(cutoff),
        countFilledPositionsCreatedBy(cutoff),
        scoped(model.departmentModel).count(),
        countDepartmentsCreatedBy(cutoff),
        scoped(model.departmentPositionsModel).findAll({
            attributes: ['level'],
            group: ['level'],
            raw: true,
        }),
        countReportingLevelsCreatedBy(cutoff),
    ]);

    const vacantPositions = totalPositions - filledPositions;
    const previousVacant = previousTotal - previousFilled;
    const reportingLevels = levelRows.length;

    return {
        changePeriod: period,
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
            changePercent: calculateGrowthPercent(departments, previousDepartments),
        },
        reportingLevels: {
            count: reportingLevels,
            changePercent: calculateGrowthPercent(reportingLevels, previousReportingLevels),
        },
    };
}

export async function getOrgPositions(filters = {}) {
    const where = {};
    if (filters.departmentId != null) {
        where.departmentId = Number(filters.departmentId);
    }
    if (filters.employmentCategory) {
        where.employmentCategory = filters.employmentCategory;
    }
    if (filters.isLevelHead !== undefined) {
        where.isLevelHead = filters.isLevelHead;
    }

    return scoped(model.departmentPositionsModel).findAll({
        attributes: { exclude: excludeMeta },
        where,
        include: positionListInclude,
        order: [
            ['sortOrder', 'ASC'],
            ['departmentPositionId', 'ASC'],
        ],
    });
}

export async function getOrgPositionById(departmentPositionId) {
    return scoped(model.departmentPositionsModel).findOne({
        attributes: { exclude: excludeMeta },
        where: { departmentPositionId: Number(departmentPositionId) },
        include: positionListInclude,
    });
}

export async function updateOrgPosition(departmentPositionId, data, options = {}) {
    const positionId = Number(departmentPositionId);
    const transaction = options.transaction || await sequelize.transaction();
    const ownsTransaction = !options.transaction;

    try {
        const existing = await scoped(model.departmentPositionsModel).findOne({
            attributes: ['departmentPositionId', 'departmentId', 'level', 'isLevelHead'],
            where: { departmentPositionId: positionId },
            transaction,
        });
        if (!existing) {
            if (ownsTransaction) {
                await transaction.rollback();
            }
            return false;
        }

        const nextDepartmentId = data.departmentId !== undefined
            ? data.departmentId
            : existing.departmentId;
        const nextLevel = data.level != null ? data.level : existing.level;

        if (data.isLevelHead === false && nextDepartmentId != null) {
            const sameLevelCount = await countPositionsAtLevel(
                nextDepartmentId,
                nextLevel,
                null,
                transaction,
            );
            if (sameLevelCount <= 1) {
                data.isLevelHead = true;
            }
        }

        if (data.isLevelHead === true && nextDepartmentId != null) {
            await clearLevelHeadFlag(
                nextDepartmentId,
                nextLevel,
                positionId,
                data.updatedBy,
                transaction,
            );
        }

        const payload = { ...data };
        delete payload._levelHeadDepartmentId;
        delete payload._levelHeadLevel;

        const [count] = await scoped(model.departmentPositionsModel).update(payload, {
            where: { departmentPositionId: positionId },
            transaction,
        });

        const oldDepartmentId = existing.departmentId;
        const oldLevel = existing.level;
        const departmentChanged =
            data.departmentId !== undefined
            && Number(data.departmentId) !== Number(oldDepartmentId);
        const levelChanged =
            data.level != null
            && Number(data.level) !== Number(oldLevel);

        if (oldDepartmentId != null && (departmentChanged || levelChanged)) {
            await ensureSolePositionIsLevelHead(
                oldDepartmentId,
                oldLevel,
                data.updatedBy,
                transaction,
            );
        }

        if (nextDepartmentId != null) {
            await ensureSolePositionIsLevelHead(
                nextDepartmentId,
                nextLevel,
                data.updatedBy,
                transaction,
            );
        }

        if (ownsTransaction) {
            await transaction.commit();
        }
        return count > 0;
    } catch (error) {
        if (ownsTransaction) {
            await transaction.rollback();
        }
        throw error;
    }
}

export async function deleteOrgPosition(departmentPositionId, updatedBy) {
    const positionId = Number(departmentPositionId);
    const transaction = await sequelize.transaction();
    try {
        const existing = await scoped(model.departmentPositionsModel).findOne({
            attributes: ['departmentPositionId', 'departmentId', 'level'],
            where: { departmentPositionId: positionId },
            transaction,
        });
        if (!existing) {
            await transaction.rollback();
            return false;
        }

        await scoped(model.userDepartmentPositionsModel).destroy({
            where: { departmentPositionId: positionId },
            transaction,
        });
        const deleted = await scoped(model.departmentPositionsModel).destroy({
            where: { departmentPositionId: positionId },
            transaction,
        });

        if (existing.departmentId != null) {
            await ensureSolePositionIsLevelHead(
                existing.departmentId,
                existing.level,
                updatedBy,
                transaction,
            );
        }

        await transaction.commit();
        return deleted > 0;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function findActiveHead(departmentPositionId, userId, transaction) {
    return scoped(model.userDepartmentPositionsModel).findOne({
        attributes: { exclude: excludeMeta },
        where: {
            departmentPositionId: Number(departmentPositionId),
            userId: Number(userId),
            status: 'ACTIVE',
        },
        transaction,
    });
}

export async function addHead(data) {
    return scoped(model.userDepartmentPositionsModel).create({
        ...data,
        status: 'ACTIVE',
    });
}

export async function getHeadsByPositionId(departmentPositionId) {
    return scoped(model.userDepartmentPositionsModel).findAll({
        attributes: { exclude: excludeMeta },
        where: {
            departmentPositionId: Number(departmentPositionId),
            status: 'ACTIVE',
        },
        include: [assigneeInclude],
        order: [['userDepartmentPositionId', 'ASC']],
    });
}

export async function getHeadById(userDepartmentPositionId) {
    return scoped(model.userDepartmentPositionsModel).findOne({
        attributes: { exclude: excludeMeta },
        where: {
            userDepartmentPositionId: Number(userDepartmentPositionId),
            status: 'ACTIVE',
        },
        include: [assigneeInclude],
    });
}

export async function updateHead(userDepartmentPositionId, data, updatedBy) {
    const headId = Number(userDepartmentPositionId);
    const transaction = await sequelize.transaction();
    try {
        const existing = await scoped(model.userDepartmentPositionsModel).findOne({
            where: {
                userDepartmentPositionId: headId,
                status: 'ACTIVE',
            },
            transaction,
        });
        if (!existing) {
            await transaction.rollback();
            return null;
        }

        const [count] = await scoped(model.userDepartmentPositionsModel).update(
            { ...data, updatedBy },
            {
                where: {
                    userDepartmentPositionId: headId,
                    status: 'ACTIVE',
                },
                transaction,
            },
        );
        if (count === 0) {
            await transaction.rollback();
            return null;
        }

        await transaction.commit();
        return getHeadById(headId);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function deleteHead(userDepartmentPositionId, updatedBy, endDate) {
    const headId = Number(userDepartmentPositionId);
    const transaction = await sequelize.transaction();
    try {
        const existing = await scoped(model.userDepartmentPositionsModel).findOne({
            where: {
                userDepartmentPositionId: headId,
                status: 'ACTIVE',
            },
            transaction,
        });
        if (!existing) {
            await transaction.rollback();
            return false;
        }

        const updateData = {
            status: 'INACTIVE',
            updatedBy,
        };
        if (endDate !== undefined) {
            updateData.endDate = endDate;
        }

        const [count] = await scoped(model.userDepartmentPositionsModel).update(
            updateData,
            {
                where: {
                    userDepartmentPositionId: headId,
                    status: 'ACTIVE',
                },
                transaction,
            },
        );
        if (count === 0) {
            await transaction.rollback();
            return false;
        }

        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function departmentExists(departmentId) {
    return scoped(model.departmentModel).findOne({
        attributes: ['departmentId'],
        where: { departmentId: Number(departmentId) },
    });
}

export async function positionExists(departmentPositionId) {
    return scoped(model.departmentPositionsModel).findOne({
        attributes: ['departmentPositionId', 'departmentId', 'level', 'isLevelHead'],
        where: { departmentPositionId: Number(departmentPositionId) },
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

function buildDepartmentHierarchyMaps(departments) {
    const existingDeptIds = new Set();
    for (const dept of departments) {
        existingDeptIds.add(Number(dept.departmentId));
    }

    const parentChildrenMap = new Map();
    const childDeptIdSet = new Set();

    for (const dept of departments) {
        if (dept.parentDepartmentId == null) {
            continue;
        }

        const childId = Number(dept.departmentId);
        const parentId = Number(dept.parentDepartmentId);

        // Self-parent or missing parent → keep as root
        if (parentId === childId || !existingDeptIds.has(parentId)) {
            continue;
        }

        childDeptIdSet.add(childId);

        let children = parentChildrenMap.get(parentId);
        if (!children) {
            children = [];
            parentChildrenMap.set(parentId, children);
        }
        children.push(childId);
    }

    for (const children of parentChildrenMap.values()) {
        children.sort((a, b) => a - b);
    }

    return { parentChildrenMap, childDeptIdSet };
}

export async function getOrgTreeData() {

    // ─── 1. Fetch all data in parallel ───────────────────────────────────────
    //
    //   university  → basic university info
    //   institute   → basic institute info
    //   allDepts    → every department + its positions + active position holders (users)
    //   allStructures → parent–child edges: which department belongs under which parent
    //
    const [university, institute, allDepts, allDeptParents] = await Promise.all([

        // University (name + id only)
        scoped(model.universityModel).findOne({
            attributes: ['universityId', 'universityName'],
            raw: true
        }),

        // Institute (name + id only)
        scoped(model.instituteModel).findOne({
            attributes: ['instituteId', 'instituteName'],
            raw: true
        }),

        // Departments with deep join:
        //   department → orgPositions (sorted) → heads (ACTIVE only) → assignee user → employee
        scoped(model.departmentModel).findAll({
            attributes: ['departmentId', 'departmentName', 'departmentCode', 'departmentType'],
            order: [
                ['departmentId', 'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'level',        'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'sortOrder',    'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'positionName', 'ASC'],
            ],
            include: [
                {
                    model: model.departmentPositionsModel,
                    as: 'orgPositions',
                    attributes: ['departmentPositionId', 'positionName', 'positionCode', 'level', 'isLevelHead'],
                    where: { level: 1 },
                    required: false,
                    include: [
                        {
                            model: model.userDepartmentPositionsModel,
                            as: 'heads',
                            where: { status: 'ACTIVE' },    // only currently active holders
                            attributes: ['userDepartmentPositionId', 'status', 'joiningDate', 'endDate'],
                            required: false,                // LEFT JOIN – include positions with no active holder
                            include: [
                                {
                                    model: model.userModel,
                                    as: 'assignee',
                                    attributes: ['userId', 'userName'],
                                    include: [
                                        {
                                            model: model.employeeModel,
                                            as: 'employee',
                                            attributes: ['employeeId', 'employeeName'],
                                            required: false  // user may not have an employee profile
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }),

        // Department structure edges (child dept → parent dept)
        // Fetched separately to avoid JOIN multiplication on the main departments query
        scoped(model.departmentModel).findAll({
            attributes: ['departmentId', 'parentDepartmentId'],
            order: [['departmentId', 'ASC']],
            raw: true,
        }),
    ]);

    const { parentChildrenMap, childDeptIdSet } = buildDepartmentHierarchyMaps(allDeptParents);

    // ─── 3. Build department lookup Map: departmentId → shaped dept node ──────
    //
    //   deptNodeMap  Map<deptId, deptNode>
    //   Each node contains: departmentId, departmentName, departmentCode,
    //                        positions (shaped), and _type (for category grouping).
    //
    const deptNodeMap = new Map();  // Map<Number, Object>

    for (const deptRecord of allDepts) {
        // Convert Sequelize model instance to a plain JS object for easy property access
        const dept = deptRecord.get({ plain: true });

        // Shape positions for this department (level 1 only)
        const positions = [];
        for (const pos of (dept.orgPositions || [])) {
            if (Number(pos.level) !== 1) {
                continue;
            }

            // Shape users (active holders of this position)
            const users = [];
            for (const head of (pos.heads || [])) {
                const assignee = head.assignee  || {};
                const employee = assignee.employee || {};

                users.push({
                    userDepartmentPositionId: head.userDepartmentPositionId,
                    userId:     assignee.userId,
                    employeeId: employee.employeeId  || null,
                    name:       employee.employeeName || assignee.userName || null,
                    status:     head.status,
                    joiningDate: head.joiningDate,
                    endDate:     head.endDate
                });
            }

            positions.push({
                departmentPositionId: pos.departmentPositionId,
                positionName:  pos.positionName,
                positionCode:  pos.positionCode,
                level:         pos.level,
                isLevelHead:   pos.isLevelHead,
                users:         users       // empty array if no active holder
            });
        }

        // Store the shaped node (keep _type only for internal category grouping)
        deptNodeMap.set(dept.departmentId, {
            _type:          dept.departmentType,   // NOT exposed in response
            departmentId:   dept.departmentId,
            departmentName: dept.departmentName,
            departmentCode: dept.departmentCode,
            positions:      positions
        });
    }

    // ─── 4. Reusable recursive function: build one dept node + all its children ─
    //
    //   Returns the shaped department object ready for the API response.
    //   Recursively builds childDepartments from parentChildrenMap.
    //
    function buildDeptNode(deptId, visited) {
        if (visited.has(deptId)) return null;

        const dept = deptNodeMap.get(deptId);
        if (!dept) return null;

        visited.add(deptId);

        // Recursively build each child department
        const childDepartments = [];
        const childIds = parentChildrenMap.get(deptId) || [];
        for (const childId of childIds) {
            const childNode = buildDeptNode(childId, visited);
            if (childNode) {
                childDepartments.push(childNode);
            }
        }

        // Return the final shaped dept object (no _type in response)
        return {
            departmentId:    dept.departmentId,
            departmentName:  dept.departmentName,
            departmentCode:  dept.departmentCode,
            positions:       dept.positions,
            childDepartments: childDepartments   // empty array if no children
        };
    }

    // ─── 5. Separate root departments into Academic and Admin categories ───────
    const academicDepts = [];
    const adminDepts = [];

    for (const deptRecord of allDepts) {
        const deptId = deptRecord.departmentId;

        if (childDeptIdSet.has(Number(deptId))) continue;

        const node = buildDeptNode(deptId, new Set());
        if (!node) continue;

        const deptType = (deptNodeMap.get(deptId)._type || '').toLowerCase();

        if (deptType === 'academic') {
            academicDepts.push(node);
        } else if (deptType === 'admin') {
            adminDepts.push(node);
        }
    }

    // ─── 6. Return the final response ────────────────────────────────────────
    return {
        universityId:   university.universityId,
        universityName: university.universityName,
        institute: {
            instituteId:   institute.instituteId,
            instituteName: institute.instituteName,
            categories: [
                { categoryName: 'Academic', departments: academicDepts },
                { categoryName: 'Admin',    departments: adminDepts    },
            ],
        },
    };
}

export async function getOrgChartData() {

    // ─── 1. Fetch all data in parallel ───────────────────────────────────────
    //   Same parallel pattern as getOrgTreeData, but only id + name fields needed
    const [university, institute, allDepts, allDeptParents] = await Promise.all([

        scoped(model.universityModel).findOne({
            attributes: ['universityId', 'universityName'],
            raw: true
        }),

        scoped(model.instituteModel).findOne({
            attributes: ['instituteId', 'instituteName'],
            raw: true
        }),

        // Departments with positions and their active holders (id + name only)
        scoped(model.departmentModel).findAll({
            attributes: ['departmentId', 'departmentName', 'departmentType'],
            order: [
                ['departmentId', 'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'level',     'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'sortOrder', 'ASC'],
            ],
            include: [
                {
                    model: model.departmentPositionsModel,
                    as: 'orgPositions',
                    attributes: ['departmentPositionId', 'positionName', 'level', 'isLevelHead'],
                    where: { level: 1 },
                    required: false,
                    include: [
                        {
                            model: model.userDepartmentPositionsModel,
                            as: 'heads',
                            where: { status: 'ACTIVE' },
                            attributes: ['userDepartmentPositionId'],
                            required: false,
                            include: [
                                {
                                    model: model.userModel,
                                    as: 'assignee',
                                    attributes: ['userId', 'userName'],
                                    include: [
                                        {
                                            model: model.employeeModel,
                                            as: 'employee',
                                            attributes: ['employeeName'],
                                            required: false
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }),

        scoped(model.departmentModel).findAll({
            attributes: ['departmentId', 'parentDepartmentId'],
            order: [['departmentId', 'ASC']],
            raw: true,
        }),
    ]);

    const { parentChildrenMap, childDeptIdSet } = buildDepartmentHierarchyMaps(allDeptParents);

    // ─── 3. Build department node map (id + name, slim positions) ─────────────
    const deptNodeMap = new Map();  // Map<deptId, shaped node>

    for (const deptRecord of allDepts) {
        const dept = deptRecord.get({ plain: true });

        // Shape positions — level 1 only
        const positions = [];
        for (const pos of (dept.orgPositions || [])) {
            if (Number(pos.level) !== 1) {
                continue;
            }

            const users = [];
            for (const head of (pos.heads || [])) {
                const assignee = head.assignee  || {};
                const employee = assignee.employee || {};

                users.push({
                    userId: assignee.userId,
                    name:   employee.employeeName || assignee.userName || null
                });
            }

            positions.push({
                departmentPositionId: pos.departmentPositionId,
                positionName:  pos.positionName,
                level:         pos.level,
                isLevelHead:   pos.isLevelHead,
                users:         users
            });
        }

        deptNodeMap.set(dept.departmentId, {
            _type:          dept.departmentType,  // internal only – not in response
            departmentId:   dept.departmentId,
            departmentName: dept.departmentName,
            positions:      positions
        });
    }

    // ─── 4. Recursive builder: one dept + its child departments ───────────────
    function buildDeptNode(deptId, visited) {
        if (visited.has(deptId)) return null;

        const dept = deptNodeMap.get(deptId);
        if (!dept) return null;

        visited.add(deptId);

        const childDepartments = [];
        for (const childId of (parentChildrenMap.get(deptId) || [])) {
            const childNode = buildDeptNode(childId, visited);
            if (childNode) childDepartments.push(childNode);
        }

        return {
            departmentId:    dept.departmentId,
            departmentName:  dept.departmentName,
            positions:       dept.positions,
            childDepartments: childDepartments
        };
    }

    // ─── 5. Group root departments into Academic / Admin ─────────────────────
    const academicDepts = [];
    const adminDepts = [];

    for (const deptRecord of allDepts) {
        const deptId = deptRecord.departmentId;

        if (childDeptIdSet.has(Number(deptId))) continue;

        const node = buildDeptNode(deptId, new Set());
        if (!node) continue;

        const deptType = (deptNodeMap.get(deptId)._type || '').toLowerCase();

        if (deptType === 'academic') {
            academicDepts.push(node);
        } else if (deptType === 'admin') {
            adminDepts.push(node);
        }
    }

    // ─── 6. Return final response ────────────────────────────────────────────
    return {
        universityId:   university.universityId,
        universityName: university.universityName,
        institute: {
            instituteId:   institute.instituteId,
            instituteName: institute.instituteName,
            categories: [
                { categoryName: 'Academic', departments: academicDepts },
                { categoryName: 'Admin',    departments: adminDepts    },
            ],
        },
    };
}

export async function getPositionsByDepartment(departmentId) {
    return scoped(model.departmentPositionsModel).findAll({
        where: {
            departmentId: Number(departmentId),
        },
        attributes: [
            'departmentPositionId',
            'positionName',
            'positionCode',
            'level',
            'employmentCategory',
            'isLevelHead',
            'sortOrder',
            'departmentId'
        ],
        include: [
            {
                model: model.userDepartmentPositionsModel,
                as: 'heads',
                required: false,
                where: {
                    status: 'ACTIVE'
                },
                attributes: [
                    'userDepartmentPositionId',
                    'status',
                    'joiningDate',
                    'endDate'
                ],
                include: [
                    {
                        model: model.userModel,
                        as: 'assignee',
                        attributes: [
                            'userId',
                            'userName',
                            'email',
                            'phone'
                        ],
                        include: [
                            {
                                model: model.employeeModel,
                                as: 'employee',
                                required: false,
                                attributes: [
                                    'employeeId',
                                    'employeeName'
                                ]
                            }
                        ]
                    }
                ]
            }
        ],
        order: [
            ['level', 'ASC'],
            ['sortOrder', 'ASC']
        ]
    });
}

