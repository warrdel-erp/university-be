import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

async function assertScopedExamType(examTypeId, transaction) {
    return scoped(model.examTypeModel).findOne({
        where: { examTypeId },
        attributes: ['examTypeId'],
        transaction,
    });
}

async function assertScopedExamSetup(examSetupId, transaction) {
    return model.examSetupModel.findOne({
        where: { examSetupId },
        attributes: ['examSetupId', 'examTypeId'],
        transaction,
        include: [{
            model: model.examTypeModel.unscoped(),
            as: 'examType',
            required: true,
            where: buildScope(model.examTypeModel),
            attributes: ['examTypeId'],
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

export async function getExamSetup(acedmicYearId) {
    try {
        const examTypeWhere = {
            ...buildScope(model.examTypeModel),
            ...(acedmicYearId && { acedmicYearId }),
        };
        const employeeWhere = {
            ...buildScope(model.employeeModel),
            ...(acedmicYearId && { acedmicYearId }),
        };

        const result = await model.examSetupModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
            },
            include: [
                {
                    model: model.courseModel.unscoped(),
                    as: "course",
                    attributes: ["courseName", "capacity"],
                    where: buildScope(model.courseModel),
                    required: true,
                },
                {
                    model: model.subjectModel.unscoped(),
                    as: "subject",
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                    where: buildScope(model.subjectModel),
                    required: true,
                },
                {
                    model: model.examTypeModel.unscoped(),
                    as: "examType",
                    attributes: ["examTypeId", "examName"],
                    where: examTypeWhere,
                    required: true,
                },
                {
                    model: model.employeeModel.unscoped(),
                    as: "employee",
                    attributes: ["employee_id", "employee_name"],
                    where: employeeWhere,
                    required: false,
                },
                {
                    model: model.classRoomModel.unscoped(),
                    as: "room",
                    attributes: ["room_number", "capacity", "classRoomSectionId"],
                    where: buildScope(model.classRoomModel),
                    required: false,
                },
                {
                    model: model.userModel.unscoped(),
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
                    model: model.userModel.unscoped(),
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
