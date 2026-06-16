import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeSkill(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeSkillModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee skill:", error);
        throw error;
    }
};

export async function deleteEmployeeSkill(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeSkillModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee skill deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeSkills(employeeId, skills, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeSkillModel.destroy({
            where: { employeeId },
            transaction,
        });

        const insertData = skills.map(skill => ({
            employeeId,
            createdBy,
            updatedBy,
            name: skill.name,
            experienceInYear: skill.experienceInYear ?? null,
            experienceInMonth: skill.experienceInMonth ?? null,
            proficiencyLevel: skill.proficiencyLevel,
        }));

        return await model.employeeSkillModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee skills:", error);
        throw error;
    }
};

export async function getEmployeeSkillsByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }
        return await model.employeeSkillModel.findAll({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee skills:", error);
        throw error;
    }
};
