import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

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

    return model.addDormitoryModel.unscoped().create(DormitoryRoomData);
  } catch (error) {
    console.error("Error in add DormitoryRoom :", error);
    throw error;
  }
}

export async function getDormitoryRoomDetails() {
  try {
    return model.addDormitoryModel.unscoped().findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      include: [
        {
          model: model.dormitoryListModel.unscoped(),
          as: "dormitoryList",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.dormitoryListModel),
          required: true,
        },
        {
          model: model.roomTypeModel.unscoped(),
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

export async function getSingleDormitoryRoomDetails(dormitoryListId) {
  try {
    return model.addDormitoryModel.unscoped().findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: { dormitoryListId },
      include: [
        {
          model: model.dormitoryListModel.unscoped(),
          as: "dormitoryList",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.dormitoryListModel),
          required: true,
        },
        {
          model: model.roomTypeModel.unscoped(),
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

  const deleted = await model.addDormitoryModel.unscoped().destroy({ where: { dormitoryListId } });
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

    return model.addDormitoryModel.unscoped().update(DormitoryRoomData, {
      where: { dormitoryListId },
    });
  } catch (error) {
    console.error(`Error updating DormitoryRoom creation ${dormitoryListId}:`, error);
    throw error;
  }
}
