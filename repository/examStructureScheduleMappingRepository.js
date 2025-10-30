import * as model from "../models/index.js";

export async function addExamStructureSchedule(examDetailSchedule) {
    try {
        const result = await model.examStructureScheduleMappingModel.create(examDetailSchedule);
        return result;
    } catch (error) {
        console.error("Error adding exam Structure Schedule:", error);
        throw error;
    }
};

// export async function getExamStructureSchedule(universityId,acedmicYearId,role,instituteId) {
//     try {
//         const whereClause = {
//         ...(universityId && { universityId }),
//         ...(acedmicYearId && { acedmicYearId }),
//         ...(role === 'Head' && { institute_id: instituteId })
//         };
//         const result = await model.examStructureScheduleMappingModel.findAll({
//             attributes: {
//                 exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",]
//             },
//             where:whereClause,
//             include: [
//                 {
//                     model: model.examSetupTypeModel,
//                     as: "examSetupType",
//                     exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",],
//                     include:[
//                         {
//                             model:model.syllabusDetailsModel,
//                             as:"syllabusDetailsExam",
//                             exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
//                             include:[
//                                 {
//                                     model:model.subjectModel,
//                                     as:'syllabusSubject',
//                                     exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
//                                 }
//                             ]
//                         }
//                     ]
//                 }, 
//             ],
//         });
//         return result;
//     } catch (error) {
//         console.error("Error fetching exam Structures schedule:", error);
//         throw error;
//     }
// };


export async function getExamStructureSchedule(universityId, acedmicYearId, role, instituteId,examSetupTypeId) {
    try {
        const whereClause = {
            ...(universityId && { universityId }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { instituteId }),
            ...(examSetupTypeId && {examSetupTypeId}),
        };

        const schedules = await model.examStructureScheduleMappingModel.findAll({
            // attributes: ['examStructureScheduleMapperId', 'name', 'startingDate'],
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },

            where: whereClause,
            include: [
                {
                    model: model.examSetupTypeModel,
                    as: "examSetupType",
                    // attributes: ['examType'],
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },

                    include: [
                        {
                            model: model.syllabusDetailsModel,
                            as: "syllabusDetailsExam",
                            // attributes: ['subjectId'],
                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },

                            include: [
                                {
                                    model: model.subjectModel,
                                    as: 'syllabusSubject',
                                    // attributes: ['subjectName'],
                                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },

                                    include:[
                                        {
                                            model:model.classSubjectMapperModel,
                                            as:'subjects',
                                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                            include:[
                                                {
                                                    model:model.semesterModel,
                                                    as:'semestermapping',
                                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }, 
                                                    include:[
                                                        {
                                                            model:model.studentModel,
                                                            as:'studentSemester',
                                                            attributes:['studentId','firstName','scholarNumber','enrollNumber']
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    model: model.sessionModel,
                    as: "sessionSchedule",
                    attributes: ["sessionName"]
                }
            ]
        });

        return schedules;

    } catch (error) {
        console.error("Error fetching exam structure schedule:", error);
        throw error;
    }
}

export async function getSingleExamStructureSchedule(courseId, sessionId, universityId) {
    try {
        const result = await model.examStructureScheduleMappingModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { courseId, sessionId, universityId },
            include: [
                {
                    model: model.courseModel,
                    as: "courseExam",
                    attributes: ["courseName", "capacity"],
                },
                {
                    model: model.sessionModel,
                    as: "sessionExam",
                    attributes: ["sessionName"],
                },
                {
                    model: model.examSetupTypeModel,
                    as: "setupTypes", 
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
                }
            ],
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam Structure:", error);
        throw error;
    }
};


export async function deleteExamStructureSchedule(examStructureId) {
    try {
        const deleted = await model.examStructureScheduleMappingModel.destroy({ where: { examStructureId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam Structure:", error);
        throw error;
    }
};

export async function updateExamStructureSchedule(examStructureId, examDetail) {
    try {
        const result = await model.examStructureScheduleMappingModel.update(examDetail, {
            where: { examStructureId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam Structure:", error);
        throw error;
    }
};

export async function addExamSchedule(examDetail) {
    try {
        const result = await model.examScheduleModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error adding exam schedule:", error);
        throw error;
    }
};

export async function getDetailByExamType(examSetupTypeId) {
  try {
    const result = await model.examSetupTypeModel.findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: { examSetupTypeId },
      include: [
        {
          model: model.examStructureScheduleMappingModel,
          as: "examStructure",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          include: [
            {
              model: model.courseModel,
              as: "courseExam",
              attributes: ["courseName", "capacity"],
            },
            {
              model: model.sessionModel,
              as: "sessionExam",
              attributes: ["sessionName"],
            },
            {
              model: model.acedmicYearModel,
              as: "acedmicExam",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
          ],
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching exam structure details:", error.message);
    throw error;
  }
};