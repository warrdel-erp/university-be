import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import { Op } from 'sequelize';

export async function addRoomType(RoomTypeData) {
    try {
        const result = await scoped(model.roomTypeModel).create(RoomTypeData);
        return result;
    } catch (error) {
        console.error("Error in add RoomType :", error);
        throw error;
    }
};

export async function getRoomTypeDetails(page, limit, search) {
    try {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const offset = (pageNum - 1) * limitNum;

        const where = {};
        if (search && String(search).trim()) {
            const searchTerm = `%${String(search).trim()}%`;
            where[Op.or] = [
                { roomTypeName: { [Op.like]: searchTerm } }
            ];
        }

        const { count, rows } = await scoped(model.roomTypeModel).findAndCountAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where,
            limit: limitNum,
            offset,
            order: [["roomTypeId", "DESC"]],
        });

        return {
            rows,
            total: count,
            page: pageNum,
            limit: limitNum,
        };
    } catch (error) {
        console.error('Error fetching RoomType details:', error);
        throw error;
    }
}


export async function getSingleRoomTypeDetails(roomTypeId) {
    try {
        const RoomType = await scoped(model.roomTypeModel).findOne({
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
    const deleted = await scoped(model.roomTypeModel).destroy({ where: { roomTypeId } });
    return deleted > 0;
}

export async function updateRoomType(roomTypeId, RoomTypeData) {
    try {
        const result = await scoped(model.roomTypeModel).update(RoomTypeData, {
            where: { roomTypeId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating RoomType creation ${roomTypeId}:`, error);
        throw error;
    }
}
