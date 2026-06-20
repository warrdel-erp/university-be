import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

async function assertScopedExamSetup(examSetupId, transaction) {
    return model.examSetupModel.findOne({
        where: { examSetupId },
        attributes: ['examSetupId'],
        transaction,
        include: [{
            model: model.examTypeModel,
            as: 'examType',
            required: true,
            where: buildScope(model.examTypeModel),
            attributes: ['examTypeId'],
        }],
    });
}

export async function createExamAttendance(data) {
    if (data.examSetupId) {
        const setup = await assertScopedExamSetup(data.examSetupId);
        if (!setup) {
            throw new Error('Exam setup not found');
        }
    }
    return await scoped(model.examAttendanceModel).create(data);
}

export async function getAllExamAttendance(acedmicYearId) {
    const studentWhere = {
        ...buildScope(model.studentModel),
        ...(acedmicYearId && { acedmicYearId }),
    };

    return await scoped(model.examAttendanceModel).findAll({
        attributes: {
            exclude: ["createdAt", "updatedAt", "updatedBy", "createdBy"],
        },
        include: [
            {
                model: model.studentModel,
                as: "students",
                attributes: ["student_id", "first_name", "last_name", "scholar_number"],
                where: studentWhere,
                required: false,
            },
            {
                model: model.examSetupModel,
                as: "examSetup",
                attributes: ["exam_setup_id", "exam_type_id", "subject_id"],
                required: false,
            },
            {
                model: model.userModel,
                as: 'examAttendanceUser',
                attributes: ["universityId", "userId"],
            },
        ],
    });
};

export async function getSingleExamAttendance(examAttendanceId) {
    const record = await scoped(model.examAttendanceModel).findOne({
        attributes: {
            exclude: ["createdAt", "updatedAt", "updatedBy", "createdBy"],
        },
        where: { examAttendanceId },
        include: [
            {
                model: model.studentModel,
                as: "students",
                attributes: ["student_id", "first_name", "last_name", "scholar_number"],
                where: buildScope(model.studentModel),
                required: false,
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
            },
        ],
    });
    return record;
};

export async function updateExamAttendances(attendances) {
    const updatedRecords = [];
    for (const record of attendances) {
        const { examAttendanceId, ...data } = record;
        const existing = await scoped(model.examAttendanceModel).findOne({
            where: { examAttendanceId },
            attributes: ['examAttendanceId'],
        });
        if (!existing) {
            continue;
        }
        const [updatedRows] = await scoped(model.examAttendanceModel).update(data, {
            where: { examAttendanceId },
        });
        if (updatedRows > 0) {
            const updatedRecord = await scoped(model.examAttendanceModel).findByPk(examAttendanceId);
            updatedRecords.push(updatedRecord);
        }
    }
    return updatedRecords;
};

export async function deleteExamAttendance(examAttendanceId) {
    const existing = await scoped(model.examAttendanceModel).findOne({
        where: { examAttendanceId },
        attributes: ['examAttendanceId'],
    });
    if (!existing) {
        return false;
    }
    const deletedRows = await scoped(model.examAttendanceModel).destroy({
        where: { examAttendanceId },
    });
    return deletedRows > 0;
};
