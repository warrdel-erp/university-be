import * as model from '../models/index.js'

export async function addFaculityLoad(data) {
    try {
        const result = await model.faculityLoadModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in create faculity load:", error);
        throw error;
    }
}

export async function getFaculityLoadDetails(universityId,acedmicYearId,instituteId,role) {
    try {
        const result = await model.faculityLoadModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include:[
                {
                    model:model.employeeModel,
                    as:'employeeFaculity',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: {
                        ...(acedmicYearId && { acedmicYearId }),
                        ...(role === 'Head' && { instituteId })
                    }
                }
            ]
        });
        return result;
    } catch (error) {
        console.error(`Error in getting faculity load:`, error);
        throw error;
    };
};

export async function getSingleFaculityLoadDetails(employeeId,universityId) {    
    try {
        const result = await model.faculityLoadModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where:{
                employeeId:employeeId,
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in getting faculity load:`, error);
        throw error;
    };
};

export async function updateFaculityLoad(faculityLoadId, info) {
    try {
        const result = await model.faculityLoadModel.update(info, {
            where: {
                faculityLoadId: faculityLoadId
            }
        });
     return result; 
    } catch (error) {
        console.error(`Error updating faculity load ${faculityLoadId} :`, error);
        throw error; 
    }
};

export async function deleteFaculityLoad (faculityLoadId) {
    try {
        const result = await model.faculityLoadModel.destroy({
            where: { faculityLoadId },
            individualHooks: true
        });
        return { message: `faculity load deleted successfully for time Table Creation Id :-${faculityLoadId}` };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function updateFaculityLoadByEmployeeId(employeeId, info,transaction) {
    
    try {
        const result = await model.faculityLoadModel.update(info, {
            where: {
                employeeId: employeeId
            },
            transaction
        });
        
     return result; 
    } catch (error) {
        console.error(`Error updating faculity load by employee Id ${employeeId} :`, error);
        throw error; 
    }
};