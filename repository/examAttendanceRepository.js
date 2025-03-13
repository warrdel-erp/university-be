import * as model from "../models/index.js";

export async function createExamAttendance(data) {
    return await model.examAttendanceModel.create(data);
}

export async function getAllExamAttendance(universityId) {
    return await model.examAttendanceModel.findAll({
        attributes: {
            exclude: ["createdAt", "updatedAt", "updatedBy", "createdBy"]
        },
        include: [
            {
                model: model.studentModel,
                as: "students",
                attributes: ["student_id", "first_name", "last_name", "scholar_number"],
            },
            {
                model: model.examSetupModel,
                as: "examSetup",
                attributes: ["exam_setup_id", "exam_type_id", "subject_id"],
            },
            {
                model: model.userModel,
                as: 'examAttendanceUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }
        ]
    });
}

export async function getSingleExamAttendance(examAttendanceId, universityId) {
    return await model.examAttendanceModel.findOne({
        attributes: {
            exclude: ["createdAt", "updatedAt", "updatedBy", "createdBy",]
        },
        include: [
            {
                model: model.studentModel,
                as: "students",
                attributes: ["student_id", "first_name", "last_name", "scholar_number"],
            },
            {
                model: model.examSetupModel,
                as: "examSetup",
                attributes: ["exam_setup_id", "exam_type_id", "subject_id"],
            },
            {
                model: model.userModel,
                as: 'examAttendanceUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }
        ],
        where: { examAttendanceId },
    });
}

export async function updateExamAttendances(attendances) {
    const updatedRecords = [];
    for (const record of attendances) {
        const { examAttendanceId, ...data } = record;
        const [updatedRows] = await model.examAttendanceModel.update(data, {
            where: { examAttendanceId },
            
        });
        if (updatedRows > 0) {
            const updatedRecord = await model.examAttendanceModel.findByPk(examAttendanceId);
            updatedRecords.push(updatedRecord);
        }
    }
    return updatedRecords;
}


export async function deleteExamAttendance(examAttendanceId) {
    const deletedRows = await model.examAttendanceModel.destroy({
        where: { examAttendanceId },
    });
    return deletedRows > 0;
}
