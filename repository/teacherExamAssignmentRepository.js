import * as model from "../models/index.js";

export async function findAssignment(whereClause) {
    try {
        return await model.teacherExamAssignmentModel.findOne({ where: whereClause });
    } catch (error) {
        console.error("Error in findAssignment repository:", error);
        throw error;
    }
}

export async function assignExam(data) {
    try {
        const result = await model.teacherExamAssignmentModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in assignExam repository:", error);
        throw error;
    }
}

export async function getAssignments(whereClause) {
    try {
        const result = await model.teacherExamAssignmentModel.findAll({
            where: whereClause,
            include: [
                {
                    model: model.examScheduleModel,
                    as: 'examSchedule',
                    include: [
                        {
                            model: model.subjectModel,
                            as: 'subjectSchedule',
                            include: [
                                {
                                    model: model.courseModel,
                                    as: "courseInfo"
                                }
                            ]
                        },
                        {
                            model: model.examSetupTypeTermModel,
                            as: "examSetupTypeTerm",
                            include: [
                                {
                                    model: model.examSetupTypeModel,
                                    as: "examSetupType"
                                }
                            ]
                        }
                    ]
                },
                {
                    model: model.employeeModel,
                    as: 'teacherEmployee'
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error in getAssignments repository:", error);
        throw error;
    }
}

export async function deleteAssignment(teacherExamAssignmentId) {
    try {
        const result = await model.teacherExamAssignmentModel.destroy({
            where: { teacherExamAssignmentId }
        });
        return result;
    } catch (error) {
        console.error("Error in deleteAssignment repository:", error);
        throw error;
    }
}
