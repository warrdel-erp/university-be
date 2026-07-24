import * as model from '../models/index.js';
import { scoped, buildScope } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

const structureDepartmentIncludes = [
    {
        model: model.departmentModel,
        as: 'department',
        attributes: { exclude: excludeMeta },
        required: false,
        where: buildScope(model.departmentModel),
    },
    {
        model: model.departmentModel,
        as: 'parentDepartment',
        attributes: { exclude: excludeMeta },
        required: false,
        where: buildScope(model.departmentModel),
    },
];

export async function addDepartmentStructure(departmentStructureData) {
    try {
        const result = await scoped(model.departmentStructureModel).create(departmentStructureData);
        return result;
    } catch (error) {
        console.error("Error in add department Structure :", error);
        throw error;
    }
};

export async function getdepartmentStructureDetails() {
    try {
        const departmentStructure = await scoped(model.departmentStructureModel).findAll({
            attributes: { exclude: excludeMeta },
            include: structureDepartmentIncludes,
        });

        return departmentStructure;
    } catch (error) {
        console.error('Error fetching departmentStructure details:', error);
        throw error;
    }
}


export async function getSingledepartmentStructureDetails(departmentStructureId) {
    try {
        const departmentStructure = await scoped(model.departmentStructureModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { departmentStructureId },
            include: structureDepartmentIncludes,
        });

        return departmentStructure;
    } catch (error) {
        console.error('Error fetching departmentStructure details:', error);
        throw error;
    }
}

export async function deletedepartmentStructure(departmentStructureId) {
    const deleted = await scoped(model.departmentStructureModel).destroy({ where: { departmentStructureId } });
    return deleted > 0;
}

export async function updatedepartmentStructure(departmentStructureId, departmentStructureData) {
    try {
        const result = await scoped(model.departmentStructureModel).update(departmentStructureData, {
            where: { departmentStructureId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating departmentStructure creation ${departmentStructureId}:`, error);
        throw error;
    }
}
