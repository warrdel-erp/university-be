import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addDormitoryRoom(DormitoryRoomData) {        
    try {
        const result = await model.addDormitoryModel.create(DormitoryRoomData);
        return result;
    } catch (error) {
        console.error("Error in add DormitoryRoom :", error);
        throw error;
    }
};

export async function getDormitoryRoomDetails(universityId,acedmicYearId) {
    try {
        const DormitoryRoom = await model.addDormitoryModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model:model.dormitoryListModel,
                    as: 'dormitoryList',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                },
                {
                    model:model.roomTypeModel,
                    as: 'roomType',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]},
                    where: {
                        ...(acedmicYearId && { acedmicYearId })
                    },
                }
            ]
        });

        return DormitoryRoom;
    } catch (error) {
        console.error('Error fetching DormitoryRoom details:', error);
        throw error;
    }
}

export async function getSingleDormitoryRoomDetails(dormitoryListId) {
    try {
        const DormitoryRoom = await model.addDormitoryModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { dormitoryListId },
            include:[
                {
                    model:model.dormitoryListModel,
                    as: 'dormitoryList',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                },
                {
                    model:model.roomTypeModel,
                    as: 'roomType',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                }
            ]
        });

        return DormitoryRoom;
    } catch (error) {
        console.error('Error fetching DormitoryRoom details:', error);
        throw error;
    }
}

export async function deleteDormitoryRoom(dormitoryListId) {
    const deleted = await model.addDormitoryModel.destroy({ where: { dormitoryListId: dormitoryListId } });
    return deleted > 0;
}

export async function updateDormitoryRoom(dormitoryListId, DormitoryRoomData) {
    try {
        const result = await model.addDormitoryModel.update(DormitoryRoomData, {
            where: { dormitoryListId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating DormitoryRoom creation ${dormitoryListId}:`, error);
        throw error; 
    }
}