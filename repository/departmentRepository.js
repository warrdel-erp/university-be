import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import sequelize from '../database/sequelizeConfig.js';
import { Op } from 'sequelize';

const excludeMeta = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

const parentDepartmentInclude = {
    model: model.departmentModel,
    as: 'parentDepartment',
    attributes: ['departmentId', 'departmentName', 'departmentCode', 'departmentType', 'isDefault'],
    required: false,
};

async function assertDepartmentDeletable(departmentId, transaction) {
    const dept = await scoped(model.departmentModel).findOne({
        where: { departmentId },
        attributes: ['departmentId', 'departmentName', 'isDefault'],
        transaction,
    });
    if (dept && (dept.isDefault || ['Admin', 'Academic', 'Academics'].includes(dept.departmentName))) {
        throw new Error('Default department cannot be deleted');
    }

    const employeeCount = await scoped(model.employeeModel).count({
        where: { departmentId },
        transaction,
    });
    if (employeeCount > 0) {
        throw new Error(`Department has ${employeeCount} active employee(s) and cannot be deleted. Please reassign the employees first.`);
    }

    const courseCount = await scoped(model.courseModel).count({
        where: { departmentId },
        transaction,
    });
    if (courseCount > 0) {
        throw new Error(`Department has ${courseCount} linked program(s)/course(s) and cannot be deleted. Please reassign or delete the courses first.`);
    }

    const studentCount = await scoped(model.studentModel).count({
        where: { departmentId },
        transaction,
    });
    if (studentCount > 0) {
        throw new Error(`Department has ${studentCount} enrolled student(s) and cannot be deleted. Please reassign the students first.`);
    }

    const subjectCount = await scoped(model.subjectModel).count({
        where: { departmentId },
        transaction,
    });
    if (subjectCount > 0) {
        throw new Error(`Department has ${subjectCount} linked subject(s) and cannot be deleted. Please reassign or delete the subjects first.`);
    }

    const childCount = await scoped(model.departmentModel).count({
        where: {
            parentDepartmentId: departmentId,
            departmentId: { [Op.ne]: departmentId },
        },
        transaction,
    });
    if (childCount > 0) {
        throw new Error(`Department has ${childCount} active sub-department(s) and cannot be deleted. Please delete or reassign sub-departments first.`);
    }

    const activeHeadCount = await scoped(model.userDepartmentPositionsModel).count({
        include: [{
            model: model.departmentPositionsModel,
            as: 'position',
            where: { departmentId },
            required: true,
        }],
        where: { status: 'ACTIVE' },
        transaction,
    });
    if (activeHeadCount > 0) {
        throw new Error(`Department has ${activeHeadCount} active position holder(s)/HOD assigned and cannot be deleted. Please unassign them first.`);
    }

    const customPositionCount = await scoped(model.departmentPositionsModel).count({
        where: {
            departmentId,
            isDefault: false,
        },
        transaction,
    });
    if (customPositionCount > 0) {
        throw new Error(`Department has ${customPositionCount} custom position(s) and cannot be deleted. Please delete the custom positions first.`);
    }

    const jobCount = await scoped(model.jobModel).count({
        where: { departmentId },
        transaction,
    });
    if (jobCount > 0) {
        throw new Error(`Department has ${jobCount} associated job posting(s) and cannot be deleted.`);
    }

    const staffCount = await scoped(model.staffModel).count({
        where: { departmentId },
        transaction,
    });
    if (staffCount > 0) {
        throw new Error(`Department has ${staffCount} staff record(s) and cannot be deleted.`);
    }
}

export async function departmentExists(departmentId) {
    return scoped(model.departmentModel).findOne({
        attributes: ['departmentId'],
        where: { departmentId: Number(departmentId) },
    });
}

export async function addDepartment(departmentData, parentDepartmentId) {
    const transaction = await sequelize.transaction();
    try {
        if (parentDepartmentId) {
            const parentDepartment = await scoped(model.departmentModel).findOne({
                where: { departmentId: parentDepartmentId },
                attributes: ['departmentType'],
                transaction,
            });
            if (!parentDepartment) {
                throw new Error('Parent department not found');
            }
            departmentData.departmentType = parentDepartment.departmentType;
        }

        departmentData.parentDepartmentId = parentDepartmentId || null;

        const department = await scoped(model.departmentModel).create(departmentData, { transaction });
        await createDefaultHodPositionForDepartment(department, transaction);

        await transaction.commit();
        return department.get({ plain: true });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in add Department :', error);
        throw error;
    }
}

export async function addParentDepartment(childDepartmentId, departmentData) {
    const transaction = await sequelize.transaction();
    try {
        const childId = Number(childDepartmentId);

        const childDepartment = await scoped(model.departmentModel).findOne({
            attributes: ['departmentId', 'parentDepartmentId'],
            where: { departmentId: childId },
            transaction,
        });
        if (!childDepartment) {
            throw new Error('Department not found');
        }

        departmentData.parentDepartmentId = childDepartment.parentDepartmentId ?? null;

        const parentDepartment = await scoped(model.departmentModel).create(departmentData, { transaction });
        await createDefaultHodPositionForDepartment(parentDepartment, transaction);

        await scoped(model.departmentModel).update(
            {
                parentDepartmentId: parentDepartment.departmentId,
                updatedBy: departmentData.updatedBy,
            },
            {
                where: { departmentId: childId },
                transaction,
            },
        );

        await transaction.commit();

        return {
            parentDepartment: parentDepartment.get({ plain: true }),
            childDepartment: {
                departmentId: childId,
                parentDepartmentId: parentDepartment.departmentId,
            },
        };
    } catch (error) {
        await transaction.rollback();
        console.error('Error in add parent Department :', error);
        throw error;
    }
}

export async function getDepartmentDetails() {
    try {
        return await scoped(model.departmentModel).findAll({
            attributes: { exclude: excludeMeta },
            order: [['departmentId', 'ASC']],
            include: [parentDepartmentInclude],
        });
    } catch (error) {
        console.error('Error fetching Department details:', error);
        throw error;
    }
}

export async function getSingleDepartmentDetails(departmentId) {
    try {
        return await scoped(model.departmentModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { departmentId },
            include: [parentDepartmentInclude],
        });
    } catch (error) {
        console.error('Error fetching Department details:', error);
        throw error;
    }
}

export async function deleteDepartment(departmentId, transaction) {
    const id = Number(departmentId);
    const ownsTransaction = !transaction;
    const txn = transaction || await sequelize.transaction();

    try {
        const existing = await scoped(model.departmentModel).findOne({
            where: { departmentId: id },
            attributes: ['departmentId'],
            transaction: txn,
        });
        if (!existing) {
            if (ownsTransaction) {
                await txn.rollback();
            }
            return false;
        }

        await assertDepartmentDeletable(id, txn);

        const children = await scoped(model.departmentModel).findAll({
            where: {
                parentDepartmentId: id,
                departmentId: { [Op.ne]: id },
            },
            attributes: ['departmentId'],
            transaction: txn,
        });

        for (const child of children) {
            await deleteDepartment(child.departmentId, txn);
        }

        await scoped(model.departmentPositionsModel).destroy({
            where: { departmentId: id, isDefault: true },
            transaction: txn,
        });

        const deleted = await scoped(model.departmentModel).destroy({
            where: { departmentId: id },
            transaction: txn,
        });

        if (ownsTransaction) {
            await txn.commit();
        }
        return deleted > 0;
    } catch (error) {
        if (ownsTransaction) {
            await txn.rollback();
        }
        throw error;
    }
}

export async function updateDepartment(departmentId, departmentData) {
    try {
        const existing = await scoped(model.departmentModel).findOne({
            where: { departmentId },
            attributes: ['departmentId'],
        });
        if (!existing) {
            return false;
        }

        if (departmentData.parentDepartmentId != null) {
            const parentId = Number(departmentData.parentDepartmentId);
            if (parentId === Number(departmentId)) {
                throw new Error('Department cannot be its own parent');
            }

            const parentDepartment = await scoped(model.departmentModel).findOne({
                attributes: ['departmentId'],
                where: { departmentId: parentId },
            });
            if (!parentDepartment) {
                throw new Error('Parent department not found');
            }
        }

        await scoped(model.departmentModel).update(departmentData, {
            where: { departmentId },
        });
        return true;
    } catch (error) {
        console.error(`Error updating Department creation ${departmentId}:`, error);
        throw error;
    }
}

export async function employeeDetail(departmentId) {
    try {
        return await scoped(model.employeeModel).findAll({
            where: { departmentId: Number(departmentId) },
            attributes: { exclude: excludeMeta },
        });
    } catch (error) {
        console.error('Error fetching employee details:', error);
        throw error;
    }
}

export async function createDefaultDepartmentsForInstitute(
    { instituteId, universityId, createdBy },
    transaction
) {
    let userId = createdBy;
    if (!userId) {
        const defaultUser = await model.userModel.findOne({
            attributes: ['userId'],
            order: [['userId', 'ASC']],
            transaction,
        });
        userId = defaultUser ? defaultUser.userId : null;
    }

    const existingAcademic = await model.departmentModel.findOne({
        where: {
            instituteId,
            [Op.or]: [
                { departmentType: 'Academic' },
                { departmentName: ['Academic', 'Academics'] },
            ],
        },
        transaction,
    });

    const existingAdmin = await model.departmentModel.findOne({
        where: {
            instituteId,
            [Op.or]: [
                { departmentType: 'Admin' },
                { departmentName: 'Admin' },
            ],
        },
        transaction,
    });

    const departmentsToCreate = [];

    if (!existingAcademic) {
        departmentsToCreate.push({
            departmentName: 'Academic',
            departmentCode: 'ACAD',
            departmentType: 'Academic',
            description: 'Default Academic Department',
            isDefault: true,
            universityId,
            instituteId,
            createdBy: userId,
            updatedBy: userId,
        });
    }

    if (!existingAdmin) {
        departmentsToCreate.push({
            departmentName: 'Admin',
            departmentCode: 'ADMIN',
            departmentType: 'Admin',
            description: 'Default Administrative Department',
            isDefault: true,
            universityId,
            instituteId,
            createdBy: userId,
            updatedBy: userId,
        });
    }

    if (departmentsToCreate.length > 0) {
        const createdDepts = await model.departmentModel.bulkCreate(departmentsToCreate, { transaction });
        for (const dept of createdDepts) {
            await createDefaultHodPositionForDepartment(dept, transaction);
        }
        return createdDepts;
    }

    return [];
}

export async function createDefaultHodPositionForDepartment(department, transaction) {
    if (!department || !department.departmentId) return null;

    const existingHod = await model.departmentPositionsModel.findOne({
        where: {
            departmentId: department.departmentId,
            [Op.or]: [
                { isDefault: true },
                { positionCode: 'HOD' },
                { positionName: ['Head of Department', 'HOD'] },
            ],
        },
        transaction,
    });
    if (existingHod) {
        return existingHod;
    }

    let userId = department.createdBy;
    if (!userId) {
        const defaultUser = await model.userModel.findOne({
            attributes: ['userId'],
            order: [['userId', 'ASC']],
            transaction,
        });
        userId = defaultUser ? defaultUser.userId : null;
    }

    return await model.departmentPositionsModel.create({
        departmentId: department.departmentId,
        positionName: 'Head of Department',
        positionCode: 'HOD',
        employmentCategory: 'Leadership',
        reportingType: 'Direct',
        isLevelHead: true,
        sortOrder: 1,
        level: 1,
        isDefault: true,
        universityId: department.universityId,
        instituteId: department.instituteId,
        createdBy: userId,
        updatedBy: userId,
    }, { transaction });
}
