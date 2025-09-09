import * as model from "../models/index.js";

export async function addExamStructure(examDetail) {
    try {
        const result = await model.examStructureModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error adding exam Structure:", error);
        throw error;
    }
}

export async function getExamStructure(universityId,acedmicYearId,role,instituteId) {
    try {
        const whereClause = {
        ...(universityId && { universityId }),
        ...(acedmicYearId && { acedmicYearId }),
        ...(role === 'Head' && { institute_id: instituteId })
        };
        const result = await model.examStructureModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",]
            },
            where:whereClause,
            include: [
                {
                    model: model.courseModel,
                    as: "courseExam",
                    attributes: ["courseName","capacity"],
                    // where: { universityId: universityId },
                }, 
            ],
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam Structures:", error);
        throw error;
    }
}

export async function getSingleExamStructure(courseId,sessionId, universityId) {
    try {
        const result = await model.examStructureModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { courseId,sessionId, universityId },
            include: [
                {
                    model: model.courseModel,
                    as: "courseExam",
                    attributes: ["courseName","capacity"],
                },
                {
                    model:model.sessionModel,
                    as:'sessionExam',
                    attributes: ["sessionName"],
                }
            ],
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam Structure:", error);
        throw error;
    }
}

export async function deleteExamStructure(examStructureId) {
    try {
        const deleted = await model.examStructureModel.destroy({ where: { examStructureId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam Structure:", error);
        throw error;
    }
}

export async function updateExamStructure(examStructureId, examDetail) {
    try {
        const result = await model.examStructureModel.update(examDetail, {
            where: { examStructureId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam Structure:", error);
        throw error;
    }
}
