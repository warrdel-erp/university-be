import * as model from '../models/index.js'

export async function addDepartment(departmentData) {
    console.log(`>>>>>>departmentData>>>>>>.`,departmentData);
    
    return
    try {
        const result = await model.departmentModel.create(departmentData);
        return result;
    } catch (error) {
        console.error("Error in add Department :", error);
        throw error;
    }
};

export async function getDepartmentDetails(universityId) {
    try {
        const Department = await model.departmentModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { universityId },
            include:
                [
                    {
                        model: model.subAccountModel,
                        as: "subAccountDetail",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
            ]
        });

        return Department;
    } catch (error) {
        console.error('Error fetching Department details:', error);
        throw error;
    }
}


export async function getSingleDepartmentDetails(departmentId) {
    try {
        const Department = await model.departmentModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { departmentId },
            include:
                [
                    {
                        model: model.subAccountModel,
                        as: "subAccountDetail",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
            ]
        });

        return Department;
    } catch (error) {
        console.error('Error fetching Department details:', error);
        throw error;
    }
}

export async function deleteDepartment(departmentId) {
    const deleted = await model.departmentModel.destroy({ where: { departmentId: departmentId } });
    return deleted > 0;
}

export async function updateDepartment(departmentId, DepartmentData) {
    try {
        const result = await model.departmentModel.update(DepartmentData, {
            where: { departmentId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating Department creation ${departmentId}:`, error);
        throw error;
    }
}

export async function getlatestEntry(subAccountId) {
    console.log(`>>>>>>>>>>subAccountId`,subAccountId);
    
    try {
        const department = await model.departmentModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { subAccountId },
            order: [['department_order', 'DESC']],  
            limit: 1,
        });

        return department;
    } catch (error) {
        console.error('Error fetching latest entry details:', error);
        throw error;
    }
}
