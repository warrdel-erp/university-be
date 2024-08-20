import * as model from '../models/index.js'

export async function addEmployee(data) {    
    try {
        const result = await model.employeeModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee :", error);
        throw error;
    }
};

export async function getAllEmployee() {
    try {
        const result = await model.employeeModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include:[
               {
                model:model.employeeAddressModel,
                as:'address',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeOfficeModel,
                as:'office',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.emplopeeRoleModel,
                as:'role',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               }
            ]
        });      
        return result;
    } catch (error) {
        console.error(`Error in getting all employee :`, error);
        throw error;
    };
};
