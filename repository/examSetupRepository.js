import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

async function assertScopedExamType(examSetupTypeId, transaction) {
    return scoped(model.examSetupTypeModel).findOne({
        where: { examSetupTypeId },
        attributes: ['examSetupTypeId'],
        transaction,
    });
}

async function assertScopedExamSetup(examSetupId, transaction) {
    return model.examSetupModel.findOne({
        where: { examSetupId },
        attributes: ['examSetupId', 'examTypeId'],
        transaction,
        include: [{
            model: model.examSetupTypeModel,
            as: 'examSetupType',
            required: true,
            where: buildScope(model.examSetupTypeModel),
            attributes: ['examSetupTypeId'],
        }],
    });
}

export async function addExamSetup(examDetail) {
    try {
        const examType = await assertScopedExamType(examDetail.examTypeId);
        if (!examType) {
            throw new Error('Exam type not found');
        }
        const result = await model.examSetupModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error adding exam setup:", error);
        throw error;
    }
}

export async function getExamSetup(academicYearId) {
    try {
        const examTypeWhere = {
            ...buildScope(model.examSetupTypeModel),
            ...(academicYearId && { academicYearId }),
        };
        const employeeWhere = {
            ...buildScope(model.employeeModel),
            ...(academicYearId && { academicYearId }),
        };

        const result = await model.examSetupModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
            },
            include: [
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseName", "capacity"],
                    where: buildScope(model.courseModel),
                    required: true,
                },
                {
                    model: model.subjectModel,
                    as: "subject",
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                    where: buildScope(model.subjectModel),
                    required: true,
                },
                {
                    model: model.examSetupTypeModel,
                    as: "examSetupType",
                    attributes: ["examSetupTypeId", "examName"],
                    where: examTypeWhere,
                    required: true,
                },
                {
                    model: model.employeeModel,
                    as: "employee",
                    attributes: ["employee_id", "employee_name"],
                    where: employeeWhere,
                    required: false,
                },
                {
                    model: model.classRoomModel,
                    as: "room",
                    attributes: ["room_number", "capacity", "classRoomSectionId"],
                    where: buildScope(model.classRoomModel),
                    required: false,
                },
                {
                    model: model.userModel,
                    as: 'examSetUpUser',
                    attributes: ["universityId", "userId"],
                },
            ],
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam setups:", error);
        throw error;
    }
}

export async function getSingleExamSetup(examSetupId) {
    try {
        const result = await assertScopedExamSetup(examSetupId);
        if (!result) {
            return null;
        }
        return await model.examSetupModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { examSetupId },
            include: [
                {
                    model: model.userModel,
                    as: 'examSetUpUser',
                    attributes: ["universityId", "userId"],
                },
            ],
        });
    } catch (error) {
        console.error("Error fetching exam setup:", error);
        throw error;
    }
}

export async function deleteExamSetup(examSetupId) {
    try {
        const existing = await assertScopedExamSetup(examSetupId);
        if (!existing) {
            return false;
        }
        const deleted = await model.examSetupModel.destroy({ where: { examSetupId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam setup:", error);
        throw error;
    }
}

export async function updateExamSetup(examSetupId, examDetail) {
    try {
        const existing = await assertScopedExamSetup(examSetupId);
        if (!existing) {
            return [0];
        }
        if (examDetail.examTypeId) {
            const examType = await assertScopedExamType(examDetail.examTypeId);
            if (!examType) {
                throw new Error('Exam type not found');
            }
        }
        const result = await model.examSetupModel.update(examDetail, {
            where: { examSetupId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam setup:", error);
        throw error;
    }
}
