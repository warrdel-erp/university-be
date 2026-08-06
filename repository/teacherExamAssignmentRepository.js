import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

async function assertScopedExamSchedule(examScheduleId, transaction) {
    return scoped(model.examScheduleModel).findOne({
        where: { examScheduleId },
        attributes: ['examScheduleId', 'academicYearId'],
        transaction,
    });
}

export async function findAssignment(whereClause) {
    try {
        return await scoped(model.teacherExamAssignmentModel).findOne({
            where: whereClause,
            include: [{
                model: model.examScheduleModel,
                as: 'examSchedule',
                required: true,
                where: buildScope(model.examScheduleModel),
                attributes: ['examScheduleId'],
            }],
        });
    } catch (error) {
        console.error("Error in findAssignment repository:", error);
        throw error;
    }
}

export async function assignExam(data) {
    try {
        const schedule = await assertScopedExamSchedule(data.examScheduleId);
        if (!schedule) {
            throw new Error('Exam schedule not found');
        }
        data.academicYearId = schedule.academicYearId;
        const result = await scoped(model.teacherExamAssignmentModel).create(data);
        return result;
    } catch (error) {
        console.error("Error in assignExam repository:", error);
        throw error;
    }
}

export async function getAssignments(whereClause) {
    try {
        const result = await scoped(model.teacherExamAssignmentModel).findAll({
            where: whereClause,
            include: [
                {
                    model: model.examScheduleModel,
                    as: 'examSchedule',
                    required: true,
                    where: buildScope(model.examScheduleModel),
                    include: [
                        {
                            model: model.subjectModel,
                            as: 'subjectSchedule',
                            where: buildScope(model.subjectModel),
                            required: false,
                            include: [
                                {
                                    model: model.courseModel,
                                    as: "courseInfo",
                                },
                            ],
                        },
                        {
                            model: model.examSetupTypeTermModel,
                            as: "examSetupTypeTerm",
                            where: buildScope(model.examSetupTypeTermModel),
                            required: false,
                            include: [
                                {
                                    model: model.examSetupTypeModel,
                                    as: "examSetupType",
                                    where: buildScope(model.examSetupTypeModel),
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.employeeModel,
                    as: 'teacherEmployee',
                    where: buildScope(model.employeeModel),
                    required: false,
                },
            ],
        });
        return result;
    } catch (error) {
        console.error("Error in getAssignments repository:", error);
        throw error;
    }
}

export async function deleteAssignment(teacherExamAssignmentId) {
    try {
        const existing = await scoped(model.teacherExamAssignmentModel).findOne({
            where: { teacherExamAssignmentId },
            attributes: ['teacherExamAssignmentId'],
        });
        if (!existing) {
            return 0;
        }
        const result = await scoped(model.teacherExamAssignmentModel).destroy({
            where: { teacherExamAssignmentId },
        });
        return result;
    } catch (error) {
        console.error("Error in deleteAssignment repository:", error);
        throw error;
    }
}
