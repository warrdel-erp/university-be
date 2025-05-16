import * as model from "../models/index.js";

export async function addExamSetup(examDetail) {
    try {
        const result = await model.examSetupModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error adding exam setup:", error);
        throw error;
    }
}

export async function getExamSetup(universityId,acedmicYearId) {
    try {
        const result = await model.examSetupModel.findAll({
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
                        ...(acedmicYearId && { acedmicYearId })
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
                    as: 'examSetUpUser',
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

export async function getSingleExamSetup(examSetupId, universityId) {
    try {
        const result = await model.examSetupModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { examSetupId },
            include: [
                {
                    model: model.userModel,
                    as: 'examSetUpUser',
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

export async function deleteExamSetup(examSetupId) {
    try {
        const deleted = await model.examSetupModel.destroy({ where: { examSetupId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam setup:", error);
        throw error;
    }
}

export async function updateExamSetup(examSetupId, examDetail) {
    try {
        const result = await model.examSetupModel.update(examDetail, {
            where: { examSetupId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam setup:", error);
        throw error;
    }
}
