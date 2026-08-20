import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function addDormitoryRoom(DormitoryRoomData) {
  try {
    const dormitory = await scoped(model.dormitoryListModel).findOne({
      attributes: ["dormitoryListId"],
      where: { dormitoryListId: DormitoryRoomData.dormitory },
    });
    if (!dormitory) {
      throw new Error("Dormitory not found");
    }

    const roomType = await scoped(model.roomTypeModel).findOne({
      attributes: ["roomTypeId"],
      where: { roomTypeId: DormitoryRoomData.type },
    });
    if (!roomType) {
      throw new Error("Room type not found");
    }

    return scoped(model.addDormitoryModel).create(DormitoryRoomData);
  } catch (error) {
    console.error("Error in add DormitoryRoom :", error);
    throw error;
  }
}

export async function getDormitoryRoomDetails(page, limit, search) {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      where[Op.or] = [
        { roomNumber: { [Op.like]: searchTerm } },
        { "$dormitoryList.dormitoryName$": { [Op.like]: searchTerm } },
        { "$roomType.roomTypeName$": { [Op.like]: searchTerm } }
      ];
    }

    const { count, rows } = await scoped(model.addDormitoryModel).findAndCountAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where,
      include: [
        {
          model: model.dormitoryListModel,
          as: "dormitoryList",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.dormitoryListModel),
          required: true,
        },
        {
          model: model.roomTypeModel,
          as: "roomType",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.roomTypeModel),
          required: true,
        },
      ],
      limit: limitNum,
      offset,
      subQuery: false,
      order: [["dormitoryListId", "DESC"]],
    });

    return {
      rows,
      total: count,
      page: pageNum,
      limit: limitNum,
    };
  } catch (error) {
    console.error("Error fetching DormitoryRoom details:", error);
    throw error;
  }
}

export async function getSingleDormitoryRoomDetails(dormitoryListId) {
  try {
    return scoped(model.addDormitoryModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: { dormitoryListId },
      include: [
        {
          model: model.dormitoryListModel,
          as: "dormitoryList",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.dormitoryListModel),
          required: true,
        },
        {
          model: model.roomTypeModel,
          as: "roomType",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.roomTypeModel),
          required: true,
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching DormitoryRoom details:", error);
    throw error;
  }
}

export async function deleteDormitoryRoom(dormitoryListId) {
  const existing = await getSingleDormitoryRoomDetails(dormitoryListId);
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.addDormitoryModel).destroy({ where: { dormitoryListId } });
  return deleted > 0;
}

export async function updateDormitoryRoom(dormitoryListId, DormitoryRoomData) {
  try {
    const existing = await getSingleDormitoryRoomDetails(dormitoryListId);
    if (!existing) {
      return [0];
    }

    if (DormitoryRoomData.dormitory) {
      const dormitory = await scoped(model.dormitoryListModel).findOne({
        attributes: ["dormitoryListId"],
        where: { dormitoryListId: DormitoryRoomData.dormitory },
      });
      if (!dormitory) {
        return [0];
      }
    }

    if (DormitoryRoomData.type) {
      const roomType = await scoped(model.roomTypeModel).findOne({
        attributes: ["roomTypeId"],
        where: { roomTypeId: DormitoryRoomData.type },
      });
      if (!roomType) {
        return [0];
      }
    }

    return scoped(model.addDormitoryModel).update(DormitoryRoomData, {
      where: { dormitoryListId },
    });
  } catch (error) {
    console.error(`Error updating DormitoryRoom creation ${dormitoryListId}:`, error);
    throw error;
  }
}
