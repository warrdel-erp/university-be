import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import sequelize from '../database/sequelizeConfig.js';

const excludeMeta = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

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
                transaction
            });
            if (!parentDepartment) {
                throw new Error('Parent department not found');
            }
            departmentData.departmentType = parentDepartment.departmentType;
        }

        const department = await scoped(model.departmentModel).create(departmentData, { transaction });
        
        await scoped(model.departmentStructureModel).create({
            departmentId: department.departmentId,
            parentDepartmentId: parentDepartmentId || null,
            createdBy: departmentData.createdBy,
            updatedBy: departmentData.updatedBy
        }, { transaction });

        await transaction.commit();
        
        const plainDept = department.get({ plain: true });
        plainDept.parentDepartmentId = parentDepartmentId || null;
        return plainDept;
    } catch (error) {
        await transaction.rollback();
        console.error('Error in add Department :', error);
        throw error;
    }
}

export async function getDepartmentDetails() {
    try {
        const departments = await scoped(model.departmentModel).findAll({
            attributes: { exclude: excludeMeta },
            order: [['departmentId', 'ASC']],
            include: [
                {
                    model: model.departmentStructureModel,
                    as: 'departmentStructures',
                    attributes: ['parentDepartmentId'],
                    include: [
                        {
                            model: model.departmentModel,
                            as: 'parentDepartment',
                            attributes: ['departmentId', 'departmentName', 'departmentCode', 'departmentType']
                        }
                    ]
                }
            ]
        });

        return departments.map(dept => {
            const plainDept = dept.get({ plain: true });
            const structure = plainDept.departmentStructures?.[0];
            plainDept.parentDepartment = structure?.parentDepartment || null;
            plainDept.parentDepartmentId = structure?.parentDepartmentId || null;
            delete plainDept.departmentStructures;
            return plainDept;
        });
    } catch (error) {
        console.error('Error fetching Department details:', error);
        throw error;
    }
}

export async function getSingleDepartmentDetails(departmentId) {
    try {
        const dept = await scoped(model.departmentModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { departmentId },
            include: [
                {
                    model: model.departmentStructureModel,
                    as: 'departmentStructures',
                    attributes: ['parentDepartmentId'],
                    include: [
                        {
                            model: model.departmentModel,
                            as: 'parentDepartment',
                            attributes: ['departmentId', 'departmentName', 'departmentCode', 'departmentType']
                        }
                    ]
                }
            ]
        });
        if (!dept) return null;
        const plainDept = dept.get({ plain: true });
        const structure = plainDept.departmentStructures?.[0];
        plainDept.parentDepartment = structure?.parentDepartment || null;
        plainDept.parentDepartmentId = structure?.parentDepartmentId || null;
        delete plainDept.departmentStructures;
        return plainDept;
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
