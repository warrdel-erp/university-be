import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addLesson(data) {
  try {
    return await scoped(model.lessonModel).create(data);
  } catch (error) {
    console.error("Error in add lesson :", error);
    throw error;
  }
}

export async function getLessonDetails(acedmicYearId) {
  try {
    const lesson = await scoped(model.lessonModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: {
        ...(acedmicYearId && { acedmicYearId }),
      },
      include: [
        {
          model: model.subjectModel,
          as: "lessonSubject",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          include: [
            {
              model: model.courseModel,
              as: "courseInfo",
              attributes: {
                exclude: [
                  "createdAt",
                  "updatedAt",
                  "deletedAt",
                  "createdBy",
                  "updatedBy",
                  "affiliated_university_id",
                  "institute_id",
                ],
              },
            },
          ],
        },
        {
          model: model.semesterModel,
          as: "lessionSemester",
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "deletedAt",
              "createdBy",
              "updatedBy",
              "specialization_id",
              "course_id",
            ],
          },
        },
        {
          model: model.sessionModel,
          as: "lessionSession",
          attributes: ["sessionName", "startingDate", "endingDate", "classTillDate"],
        },
        {
          model: model.topicModel,
          as: "topicSession",
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "deletedAt",
              "createdBy",
              "updatedBy",
              "specialization_id",
              "course_id",
            ],
          },
        },
        {
          model: model.employeeModel,
          as: "employeeLesson",
          attributes: ["employeeId", "campusId", "instituteId", "employeeCode", "employeeName"],
        },
      ],
    });
    return lesson;
  } catch (error) {
    console.error("Error fetching lesson details:", error);
    throw error;
  }
}

export async function getSingleLessonDetails(lessonId) {
  try {
    const lesson = await scoped(model.lessonModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: {
        lessonId,
      },
      include: [
        {
          model: model.subjectModel,
          as: "lessonSubject",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          include: [
            {
              model: model.courseModel,
              as: "courseInfo",
              attributes: {
                exclude: [
                  "createdAt",
                  "updatedAt",
                  "deletedAt",
                  "createdBy",
                  "updatedBy",
                  "affiliated_university_id",
                  "institute_id",
                  "acedmic_year_id",
                ],
              },
            },
          ],
        },
        {
          model: model.semesterModel,
          as: "lessionSemester",
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "deletedAt",
              "createdBy",
              "updatedBy",
              "specialization_id",
              "course_id",
            ],
          },
        },
        {
          model: model.sessionModel,
          as: "lessionSession",
          attributes: ["sessionName", "startingDate", "endingDate", "classTillDate"],
        },
        {
          model: model.topicModel,
          as: "topicSession",
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "deletedAt",
              "createdBy",
              "updatedBy",
              "specialization_id",
              "course_id",
            ],
          },
        },
      ],
    });

    return lesson;
  } catch (error) {
    console.error("Error fetching Fee Plan details single:", error);
    throw error;
  }
}

export async function addTopic(data) {
  try {
    return await scoped(model.topicModel).create(data);
  } catch (error) {
    console.error("Error in add topic :", error);
    throw error;
  }
}

export async function addSubTopic(data, transaction) {
  try {
    return await scoped(model.subTopicModel).create(data, { transaction });
  } catch (error) {
    console.error("Error in add sub topic :", error);
    throw error;
  }
}

export async function addLessionMapping(data, transaction) {
  try {
    return await scoped(model.lessonMappingModel).create(data, { transaction });
  } catch (error) {
    console.error("Error in add Lession Mapping:", error);
    throw error;
  }
}

export async function getMapping(acedmicYearId) {
  try {
    const lessonWhereClause = {
      ...(acedmicYearId && { acedmicYearId }),
      ...buildScope(model.lessonModel),
    };
    const lesson = await scoped(model.lessonMappingModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      include: [
        {
          model: model.topicModel,
          as: "mappingTopic",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          required: true,
          include: [
            {
              model: model.lessonModel,
              as: "lessonTopic",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              where: lessonWhereClause,
              required: true,
              include: [
                {
                  model: model.subjectModel,
                  as: "lessonSubject",
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                },
              ],
            },
            {
              model: model.subTopicModel,
              as: "subTopic",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              required: false,
            },
          ],
        },
        {
          model: model.classScheduleModel,
          as: "timeTableMapping",
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "deletedAt",
              "createdBy",
              "updatedBy",
              "teacher_subject_mapping_id",
              "time_table_routine_id",
              "time_table_creation_id",
              "class_room_section_id",
              "elective_subject_id",
              "subject_id",
            ],
          },
          include: [
            {
              model: model.timeTableRoutineModel,
              as: "timeTablecreate",
              required: true,
              where: buildScope(model.timeTableRoutineModel),
              attributes: {
                exclude: [
                  "createdAt",
                  "updatedAt",
                  "deletedAt",
                  "createdBy",
                  "updatedBy",
                  "time_table_name_id",
                  "course_id",
                  "campus_id",
                  "class_sections_id",
                  "acedmic_year_id",
                ],
              },
              include: [
                {
                  model: model.classSectionModel,
                  as: "timeTableClassSection",
                  attributes: ["section", "class", "section_id", "class_sections_id"],
                },
              ],
            },
            {
              model: model.timeTableStructurePeriodsModel,
              as: "timeTablecreation",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            },
            {
              model: model.employeeModel,
              as: "employeeDetails",
              attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"],
            },
            {
              model: model.teacherSubjectMappingModel,
              as: "timeTableTeacherSubject",
              attributes: {
                exclude: [
                  "createdAt",
                  "updatedAt",
                  "deletedAt",
                  "createdBy",
                  "updated",
                  "employee_id",
                  "class_subject_mapper_id",
                ],
              },
              include: [
                {
                  model: model.employeeModel,
                  as: "teacherEmployeeData",
                  attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"],
                },
              ],
            },
          ],
        },
      ],
    });
    return lesson;
  } catch (error) {
    console.error("Error fetching lesson mapping details:", error);
    throw error;
  }
}

export async function updateMapping(lessonMappingId, data) {
  try {
    const existing = await scoped(model.lessonMappingModel).findOne({
      where: { lessonMappingId },
      attributes: ['lessonMappingId'],
    });
    if (!existing) {
      throw new Error("No lesson mapping found with the given ID.");
    }

    const [updatedRowsCount] = await scoped(model.lessonMappingModel).update(data, {
      where: { lessonMappingId },
    });

    return { success: true, message: "Mapping updated successfully." };
  } catch (error) {
    console.error("Repository error during updateMapping:", error);
    throw error;
  }
}

export async function updateLessionMapping(lessonMappingId, data, transaction) {
  try {
    const existing = await scoped(model.lessonMappingModel).findOne({
      where: { lessonMappingId },
      attributes: ['lessonMappingId'],
      transaction,
    });
    if (!existing) {
      return [0];
    }
    return await scoped(model.lessonMappingModel).update(data, {
      where: { lessonMappingId },
      transaction,
    });
  } catch (error) {
    console.error("Error in update Lession Mapping:", error);
    throw error;
  }
}

export async function updateSubTopic(subTopicId, data, transaction) {
  try {
    const existing = await scoped(model.subTopicModel).findOne({
      where: { subTopicId },
      attributes: ['subTopicId'],
      transaction,
    });
    if (!existing) {
      return [0];
    }
    return await scoped(model.subTopicModel).update(data, {
      where: { subTopicId },
      transaction,
    });
  } catch (error) {
    console.error("Error in update SubTopic:", error);
    throw error;
  }
}

export async function deleteLessionMapping(lessonMappingId, transaction) {
  try {
    const existing = await scoped(model.lessonMappingModel).findOne({
      where: { lessonMappingId },
      attributes: ['lessonMappingId'],
      transaction,
    });
    if (!existing) {
      return 0;
    }
    return await scoped(model.lessonMappingModel).destroy({
      where: { lessonMappingId },
      transaction,
    });
  } catch (error) {
    console.error("Error in delete Lession Mapping:", error);
    throw error;
  }
}

export async function deleteSubTopicsByMapping(mappingId, transaction) {
  try {
    const topic = await scoped(model.topicModel).findOne({
      where: { topicId: mappingId },
      attributes: ['topicId'],
      transaction,
    });
    if (!topic) {
      return 0;
    }
    return await scoped(model.subTopicModel).destroy({
      where: { topicId: mappingId },
      transaction,
    });
  } catch (error) {
    console.error("Error in delete SubTopics:", error);
    throw error;
  }
}

// export async function getEmployeeSubjectAndLesson(acedmicYearId,employeeId,courseId,sessionId) {
//   try {
//     const whereClause = {
//       ...(employeeId && { employeeId }),
//       ...(acedmicYearId && { acedmicYearId }),
//     };
//     const lesson = await model.teacherSubjectMappingModel.findAll({
//       attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
//       where: whereClause,
//       include: [
//         {
//           model: model.classSubjectMapperModel,
//           as: "employeeSubject",
//           attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
//           include: [
//             {
//               model: model.subjectModel,
//               as: 'subjects',
//               attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
//               where:{courseId},
//               include:[
//                 {
//                   model:model.lessonModel,
//                   as:'lessonSubject',
//                   attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
//                   where:{sessionId},
//                   include:[
//                     {
//                       model: model.topicModel,
//                       as: 'topicSession',
//                       attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "specialization_id", "course_id"] },
//                     },
//                     {
//                       model: model.semesterModel,
//                       as: 'lessionSemester',
//                       attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "specialization_id", "course_id"] },
//                       where:{courseId}
//                     }
//                   ]
//                 }
//               ]
//             }
//           ]
//         }
//       ]
//     });
//     return lesson;
//   } catch (error) {
//     console.error('Error fetching lesson details:', error);
//     throw error;
//   }
// };

export async function getEmployeeSubjectAndLesson(employeeId, courseId, sessionId, subjectSearch) {
  try {
    const subjectWhere = {
      ...buildScope(model.subjectModel),
      ...(courseId && { courseId: Number(courseId) }),
      ...(subjectSearch?.trim() && {
        subjectName: { [Op.like]: `%${subjectSearch.trim()}%` },
      }),
    };
    const lessonWhere = {
      ...buildScope(model.lessonModel),
      ...(sessionId && {
        sessionId: Number(sessionId),
        ...(employeeId && { employeeId: Number(employeeId) }),
      }),
    };

    return await scoped(model.teacherSubjectMappingModel).findAll({
      where: {
        ...(employeeId && { employeeId: Number(employeeId) }),
      },
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      include: [
        {
          model: model.employeeModel.unscoped(),
          as: 'teacherEmployeeData',
          required: true,
          attributes: [],
          where: buildScope(model.employeeModel),
        },
        {
          model: model.subjectModel.unscoped(),
          as: 'employeeSubject',
          required: Boolean(subjectSearch?.trim()),
          attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
          where: subjectWhere,
          include: [
            {
              model: model.lessonModel.unscoped(),
              as: 'lessonSubject',
              required: false,
              attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
              where: lessonWhere,
              include: [
                {
                  model: model.topicModel.unscoped(),
                  as: 'topicSession',
                  required: false,
                  attributes: {
                    exclude: [
                      'createdAt',
                      'updatedAt',
                      'deletedAt',
                      'createdBy',
                      'updatedBy',
                      'specialization_id',
                      'course_id',
                    ],
                  },
                },
                {
                  model: model.semesterModel.unscoped(),
                  as: 'lessionSemester',
                  required: false,
                  attributes: {
                    exclude: [
                      'createdAt',
                      'updatedAt',
                      'deletedAt',
                      'createdBy',
                      'updatedBy',
                      'specialization_id',
                      'course_id',
                    ],
                  },
                  ...(courseId && { where: { courseId: Number(courseId) } }),
                },
              ],
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching lesson details:', error);
    throw error;
  }
}

export async function getSimpleLessonList(whereClause) {
  try {
    const lessons = await scoped(model.lessonModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: whereClause,
    });
    return lessons;
  } catch (error) {
    console.error("Error fetching simple lesson list:", error);
    throw error;
  }
}
