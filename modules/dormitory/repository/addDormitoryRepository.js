import * as model from "../../../models/index.js";
import { buildScope, scoped } from "../../../utility/scoped.js";

export async function addDormitoryRoom(DormitoryRoomData, transaction) {
  try {
    const dormitory = await scoped(model.dormitoryListModel).findOne({
      attributes: ["dormitoryListId"],
      where: { dormitoryListId: DormitoryRoomData.dormitory },
      transaction,
    });
    if (!dormitory) {
      throw new Error("Dormitory not found");
    }

    const roomType = await scoped(model.roomTypeModel).findOne({
      attributes: ["roomTypeId"],
      where: { roomTypeId: DormitoryRoomData.type },
      transaction,
    });
    if (!roomType) {
      throw new Error("Room type not found");
    }

    return scoped(model.addDormitoryModel).create(DormitoryRoomData, { transaction });
  } catch (error) {
    console.error("Error in add DormitoryRoom :", error);
    throw error;
  }
}

export async function getDormitoryRoomDetails() {
  try {
    return scoped(model.addDormitoryModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
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

export async function getSingleDormitoryRoomDetails(dormitoryListId, transaction) {
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
      transaction,
    });
  } catch (error) {
    console.error("Error fetching DormitoryRoom details:", error);
    throw error;
  }
}

export async function deleteDormitoryRoom(dormitoryListId, transaction) {
  const existing = await getSingleDormitoryRoomDetails(dormitoryListId, transaction);
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.addDormitoryModel).destroy({
    where: { dormitoryListId },
    transaction,
    individualHooks: true,
  });
  return deleted > 0;
}

export async function updateDormitoryRoom(dormitoryListId, DormitoryRoomData, transaction) {
  try {
    const existing = await getSingleDormitoryRoomDetails(dormitoryListId, transaction);
    if (!existing) {
      return [0];
    }

    if (DormitoryRoomData.dormitory) {
      const dormitory = await scoped(model.dormitoryListModel).findOne({
        attributes: ["dormitoryListId"],
        where: { dormitoryListId: DormitoryRoomData.dormitory },
        transaction,
      });
      if (!dormitory) {
        return [0];
      }
    }

    if (DormitoryRoomData.type) {
      const roomType = await scoped(model.roomTypeModel).findOne({
        attributes: ["roomTypeId"],
        where: { roomTypeId: DormitoryRoomData.type },
        transaction,
      });
      if (!roomType) {
        return [0];
      }
    }

    return scoped(model.addDormitoryModel).update(DormitoryRoomData, {
      where: { dormitoryListId },
      transaction,
      individualHooks: true,
    });
  } catch (error) {
    console.error(`Error updating DormitoryRoom creation ${dormitoryListId}:`, error);
    throw error;
  }
}
