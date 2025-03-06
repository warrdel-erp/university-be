import * as model from '../models/index.js'

export async function addTimeTableName(data,transaction) {    
    try {
        const result = await model.timeTableNameModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in create time table name:", error);
        throw error;
    }
}

export async function addTimeTable(data,transaction) {
    const timeSlot = data.timeSlots.map(slot => ({...slot,weekOff: slot.weekOff }));    
    try {
        const result = await model.timeTableCreationModel.bulkCreate(timeSlot,{transaction});
        return result;
    } catch (error) {
        console.error("Error in create time table:", error);
        throw error;
    }
}

export async function getTimeTableDetails() {
    try {
        const result = await model.timeTableCreationModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model:model.timeTableNameModel,
                    as:'timeTableName',
                    attributes: ["name"],
                }
            ]
        });
        return result;
    } catch (error) {
        console.error(`Error in getting time table:`, error);
        throw error;
    };
};

export async function getSingleTimeTableDetails(courseId,universityId) {
    try {
        const result = await model.timeTableCreationModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where:{
                courseId:courseId,
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in getting time table:`, error);
        throw error;
    };
};

export async function getSingleTimeTableById(timeTableCreationId,universityId) {
    try {
        const result = await model.timeTableCreationModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where:{
                timeTableCreationId:timeTableCreationId,
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in getting time table by id:`, error);
        throw error;
    };
};

export async function updateTimeTable(timeTableCreationId, info) {
    try {
        const result = await model.timeTableCreationModel.update(info, {
            where: {
                timeTableCreationId: timeTableCreationId
            }
        });
     return result; 
    } catch (error) {
        console.error(`Error updating time table ${timeTableCreationId} :`, error);
        throw error; 
    }
};

export async function deleteTimeTable (timeTableCreationId) {
    try {
        const result = await model.timeTableCreationModel.destroy({
            where: { timeTableCreationId },
            individualHooks: true
        });
        return { message: `time table creation deleted successfully for time Table Creation Id${timeTableCreationId}` };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};