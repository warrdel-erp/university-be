import * as model from "../models/index.js";
import { Op } from "sequelize";

export async function addExamRoomCapacity(data) {
    return await model.examScheduleRoomCapacityModel.create(data);
}



export async function updateExamRoomCapacity(examScheduleRoomCapacityId, data) {
    await model.examScheduleRoomCapacityModel.update(data, {
        where: { examScheduleRoomCapacityId }
    });
    return true;
}

export async function deleteExamRoomCapacity(examScheduleRoomCapacityId) {
    return await model.examScheduleRoomCapacityModel.destroy({
        where: { examScheduleRoomCapacityId }
    });
}

export async function getExamRoomCapacityById(examScheduleRoomCapacityId) {
    return await model.examScheduleRoomCapacityModel.findByPk(examScheduleRoomCapacityId, {
        include: [
            {
                model: model.examScheduleModel,
                as: 'examSchedule',
                attributes: ['examScheduleId']
            }
        ]
    });
}
