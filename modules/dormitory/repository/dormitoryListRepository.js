import * as model from "../../../models/index.js";
import { buildScope, scoped } from "../../../utility/scoped.js";

export async function addDormitoryList(DormitoryListData, transaction) {
  try {
    return scoped(model.dormitoryListModel).create(DormitoryListData, { transaction });
  } catch (error) {
    console.error("Error in add DormitoryList :", error);
    throw error;
  }
}

export async function getDormitoryListDetails() {
  try {
    return scoped(model.dormitoryListModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
    });
  } catch (error) {
    console.error("Error fetching DormitoryList details:", error);
    throw error;
  }
}

export async function getSingleDormitoryListDetails(dormitoryListId, transaction) {
  try {
    return scoped(model.dormitoryListModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: { dormitoryListId },
      transaction,
    });
  } catch (error) {
    console.error("Error fetching DormitoryList details:", error);
    throw error;
  }
}

export async function deleteDormitoryList(dormitoryListId, transaction) {
  const existing = await scoped(model.dormitoryListModel).findOne({
    attributes: ["dormitoryListId"],
    where: { dormitoryListId },
    transaction,
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.dormitoryListModel).destroy({
    where: { dormitoryListId },
    transaction,
    individualHooks: true,
  });
  return deleted > 0;
}

export async function updateDormitoryList(dormitoryListId, DormitoryListData, transaction) {
  try {
    const existing = await scoped(model.dormitoryListModel).findOne({
      attributes: ["dormitoryListId"],
      where: { dormitoryListId },
      transaction,
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.dormitoryListModel).update(DormitoryListData, {
      where: { dormitoryListId },
      transaction,
      individualHooks: true,
    });
  } catch (error) {
    console.error(`Error updating DormitoryList creation ${dormitoryListId}:`, error);
    throw error;
  }
}
