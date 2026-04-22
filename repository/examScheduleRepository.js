import * as model from "../models/index.js";

export async function getExamSchedules(universityId, acedmicYearId, instituteId, filters = {}) {
    try {
        const { subjectId, semesterId, examSetupTypeTermId, courseId, term, sessionId } = filters;

        const result = await model.examScheduleModel.findAll({
            where: {
                ...(acedmicYearId && { acedmicYearId }),
                ...(subjectId && { subjectId }),
                ...(semesterId && { semesterId }),
                ...(examSetupTypeTermId && { examSetupTypeTermId }),
                ...(sessionId && { sessionId })
            },

            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.examScheduleRoomCapacityModel,
                    as: "roomCapacities",
                    include: [
                        {
                            model: model.classRoomModel,
                            as: "classRoom",
                            attributes: ["classRoomSectionId", "roomNumber"]
                        }
                    ]
                },
                {
                    model: model.teacherExamAssignmentModel,
                    as: "teacherAssignments",
                    include: [
                        {
                            model: model.employeeModel,
                            as: "teacherEmployee",
                            attributes: ["employeeName", "employeeId"]
                        }
                    ]
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode"]
                },
                {
                    model: model.semesterModel,
                    as: "semesterexam",
                    attributes: ["semesterId", "name"]
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["acedmicYearId", "yearTitle"]
                },
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerm",
                    attributes: ["examSetupTypeTermId", "term", "courseId"],
                    where: {
                        ...(courseId && { courseId }),
                        ...(term && { term })
                    },
                    required: (courseId || term) ? true : false,
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "examSetupType",
                            attributes: ["examSetupTypeId", "examType", "examName"],
                            where: {
                                ...(universityId && { universityId }),
                                ...(instituteId && { instituteId })
                            },
                        }
                    ]
                },
                {
                    model: model.sessionModel,
                    as: "sessionSchedule",
                    attributes: ["sessionId", "sessionName"]
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam schedules:", error);
        throw error;
    }
}
export async function getExamScheduleById(examScheduleId) {
    try {
        const result = await model.examScheduleModel.findByPk(examScheduleId, {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.examScheduleRoomCapacityModel,
                    as: "roomCapacities",
                    include: [
                        {
                            model: model.classRoomModel,
                            as: "classRoom",
                            attributes: ["classRoomSectionId", "roomNumber"]
                        }
                    ]
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode"]
                },
                {
                    model: model.semesterModel,
                    as: "semesterexam",
                    attributes: ["semesterId", "name"]
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["acedmicYearId", "yearTitle"]
                },
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerm",
                    attributes: ["examSetupTypeTermId", "term", "courseId"],
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "examSetupType",
                            attributes: ["examSetupTypeId", "examType", "examName"]
                        }
                    ]
                },
                {
                    model: model.sessionModel,
                    as: "sessionSchedule",
                    attributes: ["sessionId", "sessionName"]
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam schedule by id:", error);
        throw error;
    }
}
