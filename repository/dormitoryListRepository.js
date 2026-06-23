import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addDormitoryList(DormitoryListData) {
  try {
    return scoped(model.dormitoryListModel).create(DormitoryListData);
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

export async function getSingleDormitoryListDetails(dormitoryListId) {
  try {
    return scoped(model.dormitoryListModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: { dormitoryListId },
    });
  } catch (error) {
    console.error("Error fetching DormitoryList details:", error);
    throw error;
  }
}

export async function deleteDormitoryList(dormitoryListId) {
  const existing = await scoped(model.dormitoryListModel).findOne({
    attributes: ["dormitoryListId"],
    where: { dormitoryListId },
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.dormitoryListModel).destroy({ where: { dormitoryListId } });
  return deleted > 0;
}

export async function updateDormitoryList(dormitoryListId, DormitoryListData) {
  try {
    const existing = await scoped(model.dormitoryListModel).findOne({
      attributes: ["dormitoryListId"],
      where: { dormitoryListId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.dormitoryListModel).update(DormitoryListData, {
      where: { dormitoryListId },
    });
  } catch (error) {
    console.error(`Error updating DormitoryList creation ${dormitoryListId}:`, error);
    throw error;
  }
}
