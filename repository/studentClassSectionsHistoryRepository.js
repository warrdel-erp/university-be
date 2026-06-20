import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

async function assertStudentInScope(studentId, transaction) {
    return scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: ["studentId"],
        transaction,
    });
}

export async function createHistory(data, transaction) {
    const student = await assertStudentInScope(data.studentId, transaction);
    if (!student) {
        throw new Error("Student not found");
    }
    return model.studentClassSectionsHistoryModel.create(data, { transaction });
}

export async function getHistoryByStudentId(studentId) {
    const student = await scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: ["studentId"],
    });
    if (!student) {
        return [];
    }

    return model.studentClassSectionsHistoryModel.findAll({
        where: { studentId },
        include: [
            {
                model: model.studentModel,
                as: "student",
            },
            {
                model: model.classSectionModel,
                as: "classSection",
            },
        ],
        order: [["createdAt", "DESC"]],
    });
}

export async function bulkCreateHistory(dataList, transaction) {
    for (const data of dataList) {
        const student = await assertStudentInScope(data.studentId, transaction);
        if (!student) {
            throw new Error(`Student not found: ${data.studentId}`);
        }
    }
    return model.studentClassSectionsHistoryModel.bulkCreate(dataList, { transaction });
}
