import * as model from "../models/index.js";

export async function createHistory(data, transaction) {
    return await model.studentClassSectionsHistoryModel.create(data, { transaction });
}

export async function getHistoryByStudentId(studentId) {
    return await model.studentClassSectionsHistoryModel.findAll({
        where: { studentId },
        include: [
            {
                model: model.studentModel,
                as: 'student'
            },
            {
                model: model.classSectionModel,
                as: 'classSection'
            }
        ],
        order: [['createdAt', 'DESC']]
    });
}

export async function bulkCreateHistory(dataList, transaction) {
    return await model.studentClassSectionsHistoryModel.bulkCreate(dataList, { transaction });
}
