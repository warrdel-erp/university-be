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
        required: false,
        include: [assigneeInclude],
    },
];

export async function addOrgPosition(data) {
    return scoped(model.departmentPositionsModel).create(data);
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
        if (currentCount > 0) {
            return 100;
        }
        return 0;
    }
    return Math.round(((currentCount - previousCount) / previousCount) * 1000) / 10;
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

async function countPositionsCreatedBy(cutoff, where = {}) {
    return scoped(model.departmentPositionsModel).count({
        where: {
            ...where,
            createdAt: { [Op.lte]: cutoff },
        },
    });
}

export async function getOrgCardsStats(changePeriod) {
    const period = resolveChangePeriod(changePeriod);
    const cutoff = growthCutoffDate(period);

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
        scoped(model.departmentPositionsModel).findAll({
            attributes: ['level'],
            group: ['level'],
            raw: true,
        }),
    ]);

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
    if (filters.departmentId != null) {
        where.departmentId = Number(filters.departmentId);
    }
    if (filters.employmentCategory) {
        where.employmentCategory = filters.employmentCategory;
    }
    if (filters.isVacant !== undefined && filters.isVacant !== null && filters.isVacant !== '') {
        where.isVacant = filters.isVacant === true || filters.isVacant === 'true';
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

export async function updateOrgPosition(departmentPositionId, data) {
    const [count] = await scoped(model.departmentPositionsModel).update(data, {
        where: { departmentPositionId: Number(departmentPositionId) },
    });
    return count > 0;
}

export async function deleteOrgPosition(departmentPositionId) {
    const positionId = Number(departmentPositionId);
    const transaction = await sequelize.transaction();
    try {
        await scoped(model.userDepartmentPositionsModel).destroy({
            where: { departmentPositionId: positionId },
            transaction,
        });
        const deleted = await scoped(model.departmentPositionsModel).destroy({
            where: { departmentPositionId: positionId },
            transaction,
        });
        await transaction.commit();
        return deleted > 0;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function countActiveHeads(departmentPositionId, transaction) {
    return scoped(model.userDepartmentPositionsModel).count({
        where: {
            departmentPositionId: Number(departmentPositionId),
            status: 'ACTIVE',
        },
        transaction,
    });
}

export async function setPositionVacant(departmentPositionId, isVacant, updatedBy, transaction) {
    await scoped(model.departmentPositionsModel).update(
        { isVacant, updatedBy },
        {
            where: { departmentPositionId: Number(departmentPositionId) },
            transaction,
        },
    );
}

export async function markPositionVacant(departmentPositionId, updatedBy) {
    const positionId = Number(departmentPositionId);
    const transaction = await sequelize.transaction();
    try {
        await scoped(model.userDepartmentPositionsModel).update(
            { status: 'INACTIVE', updatedBy },
            {
                where: {
                    departmentPositionId: positionId,
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

export async function findActiveHead(departmentPositionId, userId) {
    return scoped(model.userDepartmentPositionsModel).findOne({
        attributes: { exclude: excludeMeta },
        where: {
            departmentPositionId: Number(departmentPositionId),
            userId: Number(userId),
            status: 'ACTIVE',
        },
    });
}

export async function addHead(data) {
    const transaction = await sequelize.transaction();
    try {
        const head = await scoped(model.userDepartmentPositionsModel).create(data, { transaction });
        if (data.status === 'ACTIVE') {
            await setPositionVacant(data.departmentPositionId, false, data.updatedBy, transaction);
        }
        await transaction.commit();
        return head;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getHeadsByPositionId(departmentPositionId) {
    return scoped(model.userDepartmentPositionsModel).findAll({
        attributes: { exclude: excludeMeta },
        where: { departmentPositionId: Number(departmentPositionId) },
        include: [assigneeInclude],
        order: [['userDepartmentPositionId', 'ASC']],
    });
}

export async function getHeadById(userDepartmentPositionId) {
    return scoped(model.userDepartmentPositionsModel).findOne({
        attributes: { exclude: excludeMeta },
        where: { userDepartmentPositionId: Number(userDepartmentPositionId) },
        include: [assigneeInclude],
    });
}

export async function updateHead(userDepartmentPositionId, data, updatedBy) {
    const headId = Number(userDepartmentPositionId);
    const transaction = await sequelize.transaction();
    try {
        const existing = await scoped(model.userDepartmentPositionsModel).findOne({
            where: { userDepartmentPositionId: headId },
            transaction,
        });
        if (!existing) {
            await transaction.rollback();
            return null;
        }

        const [count] = await scoped(model.userDepartmentPositionsModel).update(
            { ...data, updatedBy },
            {
                where: { userDepartmentPositionId: headId },
                transaction,
            },
        );
        if (count === 0) {
            await transaction.rollback();
            return null;
        }

        const activeCount = await countActiveHeads(existing.departmentPositionId, transaction);
        await setPositionVacant(existing.departmentPositionId, activeCount === 0, updatedBy, transaction);
        await transaction.commit();
        return getHeadById(headId);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function deleteHead(userDepartmentPositionId, updatedBy) {
    const headId = Number(userDepartmentPositionId);
    const transaction = await sequelize.transaction();
    try {
        const existing = await scoped(model.userDepartmentPositionsModel).findOne({
            where: { userDepartmentPositionId: headId },
            transaction,
        });
        if (!existing) {
            await transaction.rollback();
            return false;
        }

        const deleted = await scoped(model.userDepartmentPositionsModel).destroy({
            where: { userDepartmentPositionId: headId },
            transaction,
        });
        if (deleted === 0) {
            await transaction.rollback();
            return false;
        }

        const activeCount = await countActiveHeads(existing.departmentPositionId, transaction);
        await setPositionVacant(existing.departmentPositionId, activeCount === 0, updatedBy, transaction);
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
        attributes: ['departmentPositionId'],
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
                ['departmentName', 'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'level',        'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'sortOrder',    'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'positionName', 'ASC'],
            ],
            include: [
                {
                    model: model.departmentPositionsModel,
                    as: 'orgPositions',
                    attributes: ['departmentPositionId', 'positionName', 'positionCode', 'level'],
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
            raw: true,
        }),
    ]);

    const parentChildrenMap = new Map();
    const childDeptIdSet = new Set();

    for (const dept of allDeptParents) {
        if (!dept.parentDepartmentId) continue;

        const childId = Number(dept.departmentId);
        const parentId = Number(dept.parentDepartmentId);

        childDeptIdSet.add(childId);

        if (!parentChildrenMap.has(parentId)) {
            parentChildrenMap.set(parentId, []);
        }
        parentChildrenMap.get(parentId).push(childId);
    }

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
    function buildDeptNode(deptId) {
        const dept = deptNodeMap.get(deptId);
        if (!dept) return null;

        // Recursively build each child department
        const childDepartments = [];
        const childIds = parentChildrenMap.get(deptId) || [];
        for (const childId of childIds) {
            const childNode = buildDeptNode(childId);
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
    //
    //   Root department = a dept that is NOT in childDeptIdSet (i.e. has no parent).
    //   departmentType comparison is case-insensitive.
    //   Both categories are always returned even if empty.
    //
    const academicDepts = [];
    const adminDepts    = [];

    for (const deptRecord of allDepts) {
        const deptId = deptRecord.departmentId;

        // Skip departments that are children (they will appear inside childDepartments)
        if (childDeptIdSet.has(Number(deptId))) continue;

        const node = buildDeptNode(deptId);
        if (!node) continue;

        const deptType = (deptNodeMap.get(deptId)?._type || '').toLowerCase();

        if (deptType === 'academic') {
            academicDepts.push(node);
        } else if (deptType === 'admin') {
            adminDepts.push(node);
        }
        // Departments with other types are not exposed in this response
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
                { categoryName: 'Admin',    departments: adminDepts    }
            ]
        }
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
                ['departmentName', 'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'level',     'ASC'],
                [{ model: model.departmentPositionsModel, as: 'orgPositions' }, 'sortOrder', 'ASC'],
            ],
            include: [
                {
                    model: model.departmentPositionsModel,
                    as: 'orgPositions',
                    attributes: ['departmentPositionId', 'positionName', 'level', 'isVacant'],
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
            raw: true,
        }),
    ]);

    const parentChildrenMap = new Map();
    const childDeptIdSet = new Set();

    for (const dept of allDeptParents) {
        if (!dept.parentDepartmentId) continue;

        const childId = Number(dept.departmentId);
        const parentId = Number(dept.parentDepartmentId);

        childDeptIdSet.add(childId);

        if (!parentChildrenMap.has(parentId)) {
            parentChildrenMap.set(parentId, []);
        }
        parentChildrenMap.get(parentId).push(childId);
    }

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
                isVacant:      pos.isVacant,
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
    function buildDeptNode(deptId) {
        const dept = deptNodeMap.get(deptId);
        if (!dept) return null;

        const childDepartments = [];
        for (const childId of (parentChildrenMap.get(deptId) || [])) {
            const childNode = buildDeptNode(childId);
            if (childNode) childDepartments.push(childNode);
        }

        return {
            departmentId:    dept.departmentId,
            departmentName:  dept.departmentName,
            positions:       dept.positions,
            childDepartments: childDepartments
        };
    }

    // ─── 5. Group root departments into Academic / Admin (case-insensitive) ───
    const academicDepts = [];
    const adminDepts    = [];

    for (const deptRecord of allDepts) {
        const deptId = deptRecord.departmentId;

        if (childDeptIdSet.has(Number(deptId))) continue;  // skip children

        const node = buildDeptNode(deptId);
        if (!node) continue;

        const deptType = (deptNodeMap.get(deptId)?._type || '').toLowerCase();

        if (deptType === 'academic') {
            academicDepts.push(node);
        } else if (deptType === 'admin') {
            adminDepts.push(node);
        }
    }

    // ─── 6. Return final response (mirrors /org/tree, id + name fields only) ──
    return {
        universityId:   university.universityId,
        universityName: university.universityName,
        institute: {
            instituteId:   institute.instituteId,
            instituteName: institute.instituteName,
            categories: [
                { categoryName: 'Academic', departments: academicDepts },
                { categoryName: 'Admin',    departments: adminDepts    }
            ]
        }
    };
}

export async function getPositionsByDepartment(departmentId) {
    return scoped(model.departmentPositionsModel).findAll({
        where: {
            departmentId: Number(departmentId)
        },
        attributes: [
            'departmentPositionId',
            'positionName',
            'positionCode',
            'level',
            'employmentCategory',
            'isVacant',
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
                    'holderType',
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

