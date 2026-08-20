import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function addDormitoryList(DormitoryListData) {
  try {
    return scoped(model.dormitoryListModel).create(DormitoryListData);
  } catch (error) {
    console.error("Error in add DormitoryList :", error);
    throw error;
  }
}

export async function getDormitoryListDetails(page, limit, search) {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      where[Op.or] = [
        { dormitoryName: { [Op.like]: searchTerm } },
        { type: { [Op.like]: searchTerm } },
        { address: { [Op.like]: searchTerm } }
      ];
    }

    const { count, rows } = await scoped(model.dormitoryListModel).findAndCountAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where,
      limit: limitNum,
      offset,
      order: [["dormitoryListId", "DESC"]],
    });

    return {
      rows,
      total: count,
      page: pageNum,
      limit: limitNum,
    };
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
