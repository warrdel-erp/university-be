import * as model from "../models/index.js";
import { Op } from "sequelize";

export async function addExamRoomCapacity(data) {
    const t = await model.examRoomCapacityModel.sequelize.transaction();
    try {
        // If the new one is active (default), deactivate others
        if (data.isActive !== false) {
            await model.examRoomCapacityModel.update(
                { isActive: false },
                { 
                    where: { classRoomSectionId: data.classRoomSectionId },
                    transaction: t 
                }
            );
        }
        const result = await model.examRoomCapacityModel.create(data, { transaction: t });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

export async function getExamRoomCapacities(classRoomSectionId) {
    return await model.examRoomCapacityModel.findAll({
        where: { classRoomSectionId },
        include: [{
            model: model.examScheduleModel,
            as: 'schedules',
            attributes: ['examScheduleId']
        }]
    });
}

export async function updateExamRoomCapacity(examRoomCapacityId, data) {
    await model.examRoomCapacityModel.update(data, {
        where: { examRoomCapacityId }
    });
    return true;
}

export async function activateExamRoomCapacity(examRoomCapacityId, userId) {
    const t = await model.examRoomCapacityModel.sequelize.transaction();
    try {
        const current = await model.examRoomCapacityModel.findByPk(examRoomCapacityId, { transaction: t });
        if (!current) throw new Error("Exam room capacity not found");

        // Deactivate others for the same room
        await model.examRoomCapacityModel.update(
            { isActive: false },
            { 
                where: { 
                    classRoomSectionId: current.classRoomSectionId,
                    examRoomCapacityId: { [Op.ne]: examRoomCapacityId }
                },
                transaction: t 
            }
        );
        
        await model.examRoomCapacityModel.update({ isActive: true, updatedBy: userId }, {
            where: { examRoomCapacityId },
            transaction: t
        });
        await t.commit();
        return true;
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

export async function deleteExamRoomCapacity(examRoomCapacityId) {
    return await model.examRoomCapacityModel.destroy({
        where: { examRoomCapacityId }
    });
}

export async function getExamRoomCapacityById(examRoomCapacityId) {
    return await model.examRoomCapacityModel.findByPk(examRoomCapacityId, {
        include: [
            {
                model: model.examScheduleModel,
                as: 'schedules',
                attributes: ['examScheduleId']
            }
        ]
    });
}
