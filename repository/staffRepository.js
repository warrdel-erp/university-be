import * as model from '../models/index.js'

export async function addStaff(staffData) {
    try {
        const result = await model.staffModel.create(staffData);
        return result;
    } catch (error) {
        console.error("Error in add Staff :", error);
        throw error;
    }
};

export async function getStaffDetails(universityId) {
    try {
        const Staff = await model.staffModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { universityId },
            include:
                [
                    {
                        model: model.departmentModel,
                        as: "staffDepartment",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
                    {
                        model: model.employeeModel,
                        as: "staffEmployee",
                        attributes:  ["employeeName","employeeCode","pickColor"] ,
                    }
                ]
        });

        return Staff;
    } catch (error) {
        console.error('Error fetching Staff details:', error);
        throw error;
    }
}


export async function getSingleStaffDetails(staffId) {
    try {
        const Staff = await model.staffModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { staffId },
            include:
            [
                {
                    model: model.departmentModel,
                    as: "staffDepartment",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                },
                {
                    model: model.employeeModel,
                    as: "staffEmployee",
                    attributes:  ["employeeName","employeeCode","pickColor"] ,
                }
            ]
        });

        return Staff;
    } catch (error) {
        console.error('Error fetching Staff details:', error);
        throw error;
    }
}

export async function deleteStaff(staffId) {
    const deleted = await model.staffModel.destroy({ where: { staffId: staffId } });
    return deleted > 0;
}

export async function updateStaff(staffId, staffData) {
    try {
        const result = await model.staffModel.update(staffData, {
            where: { staffId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating Staff creation ${staffId}:`, error);
        throw error;
    }
}