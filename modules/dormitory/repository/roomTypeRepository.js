import * as model from '../../../models/index.js';
import { scoped } from '../../../utility/scoped.js';

export async function addRoomType(RoomTypeData, transaction) {
    try {
        const result = await scoped(model.roomTypeModel).create(RoomTypeData, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add RoomType :", error);
        throw error;
    }
}

export async function getRoomTypeDetails() {
    try {
        const RoomType = await scoped(model.roomTypeModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        });

        return RoomType;
    } catch (error) {
        console.error('Error fetching RoomType details:', error);
        throw error;
    }
}

export async function getSingleRoomTypeDetails(roomTypeId, transaction) {
    try {
        const RoomType = await scoped(model.roomTypeModel).findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { roomTypeId },
            transaction,
        });

        return RoomType;
    } catch (error) {
        console.error('Error fetching RoomType details:', error);
        throw error;
    }
}

export async function deleteRoomType(roomTypeId, transaction) {
    const deleted = await scoped(model.roomTypeModel).destroy({
        where: { roomTypeId },
        transaction,
        individualHooks: true,
    });
    return deleted > 0;
}

export async function updateRoomType(roomTypeId, RoomTypeData, transaction) {
    try {
        const result = await scoped(model.roomTypeModel).update(RoomTypeData, {
            where: { roomTypeId },
            transaction,
            individualHooks: true,
        });
        return result;
    } catch (error) {
        console.error(`Error updating RoomType creation ${roomTypeId}:`, error);
        throw error;
    }
}
