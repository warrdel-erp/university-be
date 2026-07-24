import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import sequelize from '../database/sequelizeConfig.js';

const excludeMeta = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

const parentDepartmentInclude = {
    model: model.departmentModel,
    as: 'parentDepartment',
    attributes: ['departmentId', 'departmentName', 'departmentCode', 'departmentType'],
    required: false,
};

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

        const previousParentDepartmentId = childDepartment.parentDepartmentId ?? null;

        departmentData.parentDepartmentId = previousParentDepartmentId;

        const parentDepartment = await scoped(model.departmentModel).create(departmentData, { transaction });

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

export async function deleteDepartment(departmentId) {
    const existing = await scoped(model.departmentModel).findOne({
        where: { departmentId },
        attributes: ['departmentId'],
    });
    if (!existing) {
        return false;
    }

    const courseCount = await scoped(model.courseModel).count({
        where: { departmentId },
    });
    if (courseCount > 0) {
        throw new Error('Department is used in course creation and cannot be deleted');
    }

    const jobCount = await scoped(model.jobModel).count({
        where: { departmentId },
    });
    if (jobCount > 0) {
        throw new Error('Department is used in jobs and cannot be deleted');
    }

    const deleted = await scoped(model.departmentModel).destroy({ where: { departmentId } });
    return deleted > 0;
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
            const parentDepartment = await scoped(model.departmentModel).findOne({
                attributes: ['departmentId'],
                where: { departmentId: Number(departmentData.parentDepartmentId) },
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

export async function employeeDetail(departmentName) {
    try {
        return await scoped(model.employeeModel).findAll({
            where: { department: departmentName },
            attributes: { exclude: excludeMeta },
        });
    } catch (error) {
        console.error('Error fetching employee details:', error);
        throw error;
    }
}
