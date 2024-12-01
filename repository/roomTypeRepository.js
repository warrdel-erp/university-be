import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addRoomType(RoomTypeData) {    
    try {
        const result = await model.roomTypeModel.create(RoomTypeData);
        return result;
    } catch (error) {
        console.error("Error in add RoomType :", error);
        throw error;
    }
};

export async function getRoomTypeDetails(universityId) {
    try {
        const RoomType = await model.roomTypeModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
        });

        return RoomType;
    } catch (error) {
        console.error('Error fetching RoomType details:', error);
        throw error;
    }
}


export async function getSingleRoomTypeDetails(roomTypeId) {
    try {
        const RoomType = await model.roomTypeModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { roomTypeId },
        });

        return RoomType;
    } catch (error) {
        console.error('Error fetching RoomType details:', error);
        throw error;
    }
}

export async function deleteRoomType(roomTypeId) {
    const deleted = await model.roomTypeModel.destroy({ where: { roomTypeId: roomTypeId } });
    return deleted > 0;
}

export async function updateRoomType(roomTypeId, RoomTypeData) {
    try {
        const result = await model.roomTypeModel.update(RoomTypeData, {
            where: { roomTypeId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating RoomType creation ${roomTypeId}:`, error);
        throw error; 
    }
}