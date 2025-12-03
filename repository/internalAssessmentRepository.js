import * as model from "../models/index.js";

export async function addInternalAssessment(examDetail) {
    try {
        const result = await model.InternalAssessmentModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error adding exam setup:", error);
        throw error;
    }
}

export async function getInternalAssessment(universityId,acedmicYearId,role,instituteId) {
    try {
        const result = await model.InternalAssessmentModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",]
            },
            include: [
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseName","capacity"],
                    where: { universityId: universityId },
                },
                {
                    model: model.subjectModel,
                    as: "subject",
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                    where: { universityId: universityId },
                },
                {
                    model: model.examTypeModel,
                    as: "examType",
                    attributes: ["examTypeId", "examName"],
                    where: {
                        ...(acedmicYearId && { acedmicYearId }),
                        ...(role === 'Head' && { instituteId }),

                    },
                },
                {
                    model: model.employeeModel,
                    as: "employee",
                    attributes: ["employee_id", "employee_name"],
                    where: {
                        ...(acedmicYearId && { acedmicYearId })
                    },
                },
                {
                    model: model.classRoomModel,
                    as: "room",
                    attributes: ["room_number", "capacity", "classRoomSectionId"],
                },
                {
                    model: model.userModel,
                    as: 'InternalAssessmentUser',
                    attributes: ["universityId", "userId"],
                    where: {
                        universityId: universityId
                    }
                }
               
            ],
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam setups:", error);
        throw error;
    }
}

export async function getSingleInternalAssessment(InternalAssessmentId, universityId) {
    try {
        const result = await model.InternalAssessmentModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { InternalAssessmentId },
            include: [
                {
                    model: model.userModel,
                    as: 'InternalAssessmentUser',
                    attributes: ["universityId", "userId"],
                    where: {
                        universityId: universityId
                    }
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam setup:", error);
        throw error;
    }
}

export async function deleteInternalAssessment(InternalAssessmentId) {
    try {
        const deleted = await model.InternalAssessmentModel.destroy({ where: { InternalAssessmentId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam setup:", error);
        throw error;
    }
}

export async function updateInternalAssessment(InternalAssessmentId, examDetail) {
    try {
        const result = await model.InternalAssessmentModel.update(examDetail, {
            where: { InternalAssessmentId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam setup:", error);
        throw error;
    }
}