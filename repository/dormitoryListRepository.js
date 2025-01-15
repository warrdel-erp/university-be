import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addDormitoryList(DormitoryListData) {
    try {
        const result = await model.dormitoryListModel.create(DormitoryListData);
        return result;
    } catch (error) {
        console.error("Error in add DormitoryList :", error);
        throw error;
    }
};

export async function getDormitoryListDetails(universityId) {
    try {
        const DormitoryList = await model.dormitoryListModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        });

        return DormitoryList;
    } catch (error) {
        console.error('Error fetching DormitoryList details:', error);
        throw error;
    }
}


export async function getSingleDormitoryListDetails(dormitoryListId) {
    try {
        const DormitoryList = await model.dormitoryListModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { dormitoryListId },
        });
        return DormitoryList;
    } catch (error) {
        console.error('Error fetching DormitoryList details:', error);
        throw error;
    }
}

export async function deleteDormitoryList(dormitoryListId) {
    const deleted = await model.dormitoryListModel.destroy({ where: { dormitoryListId: dormitoryListId } });
    return deleted > 0;
}

export async function updateDormitoryList(dormitoryListId, DormitoryListData) {
    try {
        const result = await model.dormitoryListModel.update(DormitoryListData, {
            where: { dormitoryListId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating DormitoryList creation ${dormitoryListId}:`, error);
        throw error;
    }
}