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

    // ─── 1. Fetch all data in parallel ───────────────────────────────────────
    //
    //   university  → basic university info
    //   institute   → basic institute info
    //   allDepts    → every department + its positions + active position holders (users)
    //   allStructures → parent–child edges: which department belongs under which parent
    //
    const [university, institute, allDepts, allStructures] = await Promise.all([

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
                [{ model: model.orgPositionModel, as: 'orgPositions' }, 'level',        'ASC'],
                [{ model: model.orgPositionModel, as: 'orgPositions' }, 'sortOrder',    'ASC'],
                [{ model: model.orgPositionModel, as: 'orgPositions' }, 'positionName', 'ASC'],
            ],
            include: [
                {
                    model: model.orgPositionModel,
                    as: 'orgPositions',
                    attributes: ['orgPositionId', 'positionName', 'positionCode', 'level'],
                    required: false,                         // LEFT JOIN – include depts with no positions
                    include: [
                        {
                            model: model.orgPositionHeadModel,
                            as: 'heads',
                            where: { status: 'ACTIVE' },    // only currently active holders
                            attributes: ['orgPositionHeadId'],
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
        scoped(model.departmentStructureModel).findAll({
            attributes: ['departmentId', 'parentDepartmentId'],
            raw: true
        })
    ]);

    // ─── 2. Build hierarchy lookup structures ─────────────────────────────────
    //
    //   parentChildrenMap  Map<parentId, childId[]>   – parent → its direct children
    //   childDeptIdSet     Set<childId>               – all dept IDs that have a parent
    //                                                   (root depts will NOT be in this set)
    //
    const parentChildrenMap = new Map();  // Map<Number, Number[]>
    const childDeptIdSet    = new Set();  // Set<Number>

    for (const structure of allStructures) {
        // A null/zero parentDepartmentId means this dept is a root – skip it
        if (!structure.parentDepartmentId) continue;

        const childId  = Number(structure.departmentId);
        const parentId = Number(structure.parentDepartmentId);

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

        // Shape positions for this department
        const positions = [];
        for (const pos of (dept.orgPositions || [])) {

            // Shape users (active holders of this position)
            const users = [];
            for (const head of (pos.heads || [])) {
                const assignee = head.assignee  || {};
                const employee = assignee.employee || {};

                users.push({
                    userId:     assignee.userId,
                    employeeId: employee.employeeId  || null,
                    name:       employee.employeeName || assignee.userName || null
                });
            }

            positions.push({
                orgPositionId: pos.orgPositionId,
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
    const [university, institute, allDepts, allStructures] = await Promise.all([

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
                [{ model: model.orgPositionModel, as: 'orgPositions' }, 'level',     'ASC'],
                [{ model: model.orgPositionModel, as: 'orgPositions' }, 'sortOrder', 'ASC'],
            ],
            include: [
                {
                    model: model.orgPositionModel,
                    as: 'orgPositions',
                    attributes: ['orgPositionId', 'positionName', 'level'],
                    required: false,
                    include: [
                        {
                            model: model.orgPositionHeadModel,
                            as: 'heads',
                            where: { status: 'ACTIVE' },
                            attributes: ['orgPositionHeadId'],
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

        // Structure edges (child → parent) – fetched separately to avoid JOIN duplication
        scoped(model.departmentStructureModel).findAll({
            attributes: ['departmentId', 'parentDepartmentId'],
            raw: true
        })
    ]);

    // ─── 2. Build hierarchy lookup structures ─────────────────────────────────
    const parentChildrenMap = new Map();  // Map<parentId, childId[]>
    const childDeptIdSet    = new Set();  // Set<childId> – O(1) root detection

    for (const structure of allStructures) {
        if (!structure.parentDepartmentId) continue;

        const childId  = Number(structure.departmentId);
        const parentId = Number(structure.parentDepartmentId);

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

        // Shape positions – all levels (1, 2, 3...) sorted by level ASC
        const positions = [];
        for (const pos of (dept.orgPositions || [])) {

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
                orgPositionId: pos.orgPositionId,
                positionName:  pos.positionName,
                level:         pos.level,
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
    return scoped(model.orgPositionModel).findAll({
        where: {
            departmentId: Number(departmentId)
        },
        attributes: [
            'orgPositionId',
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
                model: model.orgPositionHeadModel,
                as: 'heads',
                required: false,
                where: {
                    status: 'ACTIVE'
                },
                attributes: [
                    'orgPositionHeadId',
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

