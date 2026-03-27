import * as model from "../models/index.js";

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
                            as: 'subjectSchedule'
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
