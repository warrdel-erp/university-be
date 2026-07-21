import * as model from "../models/index.js";
import { Op, Sequelize } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import {
  classSectionTermsInclude,
  timeTableRoutineClassSectionInclude,
} from "../utility/classSectionIncludes.js";
import { buildTermName } from "../utility/courseTerms.js";

const lectureWindowInclude = {
  model: model.lectureWindowModel,
  as: "lectureWindow",
  required: false,
  attributes: {
    exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy"],
  },
};

export async function addLesson(data, transaction) {
  try {
    return await scoped(model.lessonModel).create(data, { transaction });
  } catch (error) {
    console.error("Error in add lesson :", error);
    throw error;
  }
}

export async function getLessonDetails(academicYearId) {
  try {
    const lesson = await scoped(model.lessonModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: {
        ...(academicYearId && { academicYearId }),
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
          model: model.users, as: "user",
          attributes: ["userId"],
          include: [
            {
              model: model.employeeModel,
              as: "employee",
              attributes: ["campusId", "instituteId", "employeeCode", "employeeName"],
            },
          ],
        },
        lectureWindowInclude,
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
        lectureWindowInclude,
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

export async function getLessonMappingById(lessonMappingId, transaction) {
  return scoped(model.lessonMappingModel).findOne({
    where: { lessonMappingId: Number(lessonMappingId) },
    attributes: [
      "lessonMappingId",
      "topicId",
      "timeTableCellDateWiseId",
      "timeTableCellId",
      "date",
      "completeDate",
      "note",
      "lectureUrl",
      "file",
      "status",
    ],
    transaction,
  });
}

export async function getDateWiseCellById(timeTableCellDateWiseId, transaction) {
  return model.timeTableCellDateWiseModel.findOne({
    where: { timeTableCellDateWiseId: Number(timeTableCellDateWiseId) },
    attributes: ["timeTableCellDateWiseId", "timeTableCellId", "date"],
    transaction,
  });
}

export async function getMapping(academicYearId) {
  try {
    const lessonWhereClause = {
      ...(academicYearId && { academicYearId }),
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
          model: model.timeTableCellDateWiseModel,
          as: "timeTableCellDateWise",
          required: false,
          attributes: ["timeTableCellDateWiseId", "timeTableCellId", "date", "classRoomSectionId"],
          include: [
            {
              model: model.timeTableCellModel,
              as: "timeTableCell",
              required: true,
              attributes: [
                "timeTableCellId",
                "day",
                "period",
                "timeTableType",
                "subjectId",
                "electiveSubjectId",
                "teacherSubjectMappingId",
              ],
              include: [
                {
                  model: model.timeTableRoutineModel,
                  as: "timeTableRoutine",
                  required: true,
                  where: buildScope(model.timeTableRoutineModel),
                  attributes: [
                    "timeTableRoutineId",
                    "classSectionTermId",
                    "startingDate",
                    "endingDate",
                  ],
                  include: [
                    {
                      model: model.classSectionTermModel,
                      as: "timeTableClassSectionTerm",
                      attributes: ["classSectionTermId", "term", "classSectionsId"],
                      include: [
                        {
                          model: model.classSectionModel,
                          as: "classSection",
                          attributes: ["section", "year", "classSectionsId"],
                        },
                      ],
                    },
                  ],
                },
                {
                  model: model.timeTableStructurePeriodsModel,
                  as: "timeTablecreation",
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                  required: false,
                },
                {
                  model: model.timeTableCellTeachersModel,
                  as: "timeTableCellTeachers",
                  required: false,
                  attributes: ["userId", "teacherType"],
                  include: [
                    {
                      model: model.employeeModel,
                      as: "employeeDetails",
                      attributes: ["employeeName", "employeeCode", "pickColor", "userId"],
                      required: false,
                    },
                  ],
                },
                {
                  model: model.teacherSubjectMappingModel,
                  as: "timeTableTeacherSubject",
                  required: false,
                  attributes: ["teacherSubjectMappingId", "userId"],
                  include: [
                    {
                      model: model.employeeModel,
                      as: "teacherEmployeeData",
                      attributes: ["employeeName", "employeeCode", "pickColor", "userId"],
                      required: false,
                    },
                  ],
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

// export async function getEmployeeSubjectAndLesson(academicYearId,userId,courseId,sessionId) {
//   try {
//     const whereClause = {
//       ...(userId && { userId }),
//       ...(academicYearId && { academicYearId }),
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

export async function getEmployeeSubjectAndLesson(userId, courseId, sessionId, subjectSearch, subjectId) {
  try {
    const parsedUserId = userId != null && userId !== '' ? Number(userId) : null;

    const parsedSessionId = sessionId != null && sessionId !== ''
      ? Number(sessionId)
      : null;
    const parsedSubjectId = subjectId != null && subjectId !== '' && subjectId !== 'undefined'
      ? Number(subjectId)
      : null;
    const hasUserId = Number.isInteger(parsedUserId) && parsedUserId > 0;
    const hasSessionId = Number.isInteger(parsedSessionId) && parsedSessionId > 0;
    const hasSubjectId = Number.isInteger(parsedSubjectId) && parsedSubjectId > 0;

    const subjectAttributes = {
      exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
    };
    const classSectionWhere = {
      ...buildScope(model.classSectionModel),
      ...(hasSessionId && { sessionId: parsedSessionId }),
      ...(courseId && { courseId: Number(courseId) }),
    };
    const subjectCourseInclude = {
      model: model.courseModel,
      as: 'courseInfo',
      required: false,
      attributes: ['termType', 'courseId'],
      where: buildScope(model.courseModel),
      include: [{
        model: model.classSectionModel,
        as: 'courseSection',
        required: false,
        attributes: ['classSectionsId', 'year', 'section', 'sessionId'],
        where: classSectionWhere,
        include: [classSectionTermsInclude()],
      }],
    };
    const toEmployeeSubject = (employeeSubject) => {
      if (!employeeSubject) {
        return employeeSubject;
      }

      const { courseInfo, term: subjectTerm, ...subjectData } = employeeSubject;
      const sections = [].concat(courseInfo?.courseSection ?? []);

      let matchedSection = null;
      let matchedTermRow = null;

      for (const section of sections) {
        if (hasSessionId && Number(section.sessionId) !== parsedSessionId) {
          continue;
        }

        const termRows = section.classSectionTerms || [];
        if (subjectTerm == null) {
          matchedSection = section;
          if (termRows.length) {
            matchedTermRow = termRows[0];
          }
          break;
        }

        for (const termRow of termRows) {
          if (Number(termRow.term) === Number(subjectTerm)) {
            matchedSection = section;
            matchedTermRow = termRow;
            break;
          }
        }
        if (matchedSection) {
          break;
        }
      }

      let termName = null;
      if (matchedTermRow && courseInfo?.termType) {
        termName = buildTermName(courseInfo.termType, matchedTermRow.term);
      } else if (matchedSection?.year != null && courseInfo?.termType) {
        termName = `${courseInfo.termType} ${matchedSection.year}`;
      }

      return {
        ...subjectData,
        term: subjectTerm,
        termName,
        classSectionTermId: matchedTermRow?.classSectionTermId ?? null,
        classSectionsId: matchedSection?.classSectionsId ?? null,
        year: matchedSection?.year ?? null,
        section: matchedSection?.section ?? null,
      };
    };

    const topicAttributes = {
      exclude: [
        'createdAt',
        'updatedAt',
        'deletedAt',
        'createdBy',
        'updatedBy',
        'specialization_id',
        'course_id',
      ],
    };
    const semesterAttributes = {
      exclude: [
        'createdAt',
        'updatedAt',
        'deletedAt',
        'createdBy',
        'updatedBy',
        'specialization_id',
        'course_id',
      ],
    };
    const lessonInclude = [
      {
        model: model.topicModel,
        as: 'topicSession',
        required: false,
        attributes: topicAttributes,
        where: buildScope(model.topicModel),
      },
      {
        model: model.semesterModel,
        as: 'lessionSemester',
        required: false,
        attributes: semesterAttributes,
        where: {
          ...buildScope(model.semesterModel),
          ...(courseId && { courseId: Number(courseId) }),
        },
      },
      lectureWindowInclude,
    ];

    if (hasUserId && hasSubjectId) {
      const lessons = await scoped(model.lessonModel).findAll({
        where: {
          userId: parsedUserId,
          subjectId: parsedSubjectId,
          ...(hasSessionId && { sessionId: parsedSessionId }),
        },
        attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
        include: [
          {
            model: model.userModel, as: "user",
            required: true,
            paranoid: false,
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'password'] },
            include: [{
              model: model.employeeModel, as: "employee",
              attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            }]
          },
          {
            model: model.subjectModel,
            as: 'lessonSubject',
            required: true,
            attributes: subjectAttributes,
            where: {
              ...buildScope(model.subjectModel),
              subjectId: parsedSubjectId,
              ...(courseId && { courseId: Number(courseId) }),
            },
            include: [subjectCourseInclude],
          },
          ...lessonInclude,
        ],
        order: [['lessonId', 'ASC']],
      });

      if (!lessons.length) {
        return [];
      }

      const plainLessons = lessons.map((row) => row.get({ plain: true }));
      const { employeeLesson, lessonSubject } = plainLessons[0];

      return [{
        userId: parsedUserId,
        subjectId: parsedSubjectId,
        teacherEmployeeData: employeeLesson,
        employeeSubject: {
          ...toEmployeeSubject(lessonSubject),
          lessonSubject: plainLessons.map(({
            employeeLesson: _employee,
            lessonSubject: _subject,
            topicSession,
            lessionSemester,
            ...lesson
          }) => ({
            ...lesson,
            topicSession,
            lessionSemester,
          })),
        },
      }];
    }

    const subjectWhere = {
      ...buildScope(model.subjectModel),
      ...(courseId && { courseId: Number(courseId) }),
      ...(hasSubjectId && { subjectId: parsedSubjectId }),
      ...(subjectSearch?.trim() && {
        subjectName: { [Op.like]: `%${subjectSearch.trim()}%` },
      }),
    };
    const lessonWhere = {
      ...buildScope(model.lessonModel),
      ...(hasSessionId && { sessionId: parsedSessionId }),
      ...(hasUserId && { userId: parsedUserId }),
      ...(hasSubjectId && { subjectId: parsedSubjectId }),
    };

    const rows = await scoped(model.teacherSubjectMappingModel).findAll({
      where: {
        ...(hasUserId && { userId: parsedUserId }),
        ...(hasSubjectId && { subjectId: parsedSubjectId }),
      },
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      include: [
        {
          model: model.employeeModel,
          as: 'teacherEmployeeData',
          required: true,
          paranoid: false,
          attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
          where: buildScope(model.employeeModel),
        },
        {
          model: model.subjectModel,
          as: 'employeeSubject',
          required: Boolean(subjectSearch?.trim() || hasSubjectId),
          attributes: subjectAttributes,
          where: subjectWhere,
          include: [
            subjectCourseInclude,
            {
              model: model.lessonModel,
              as: 'lessonSubject',
              required: false,
              attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
              where: lessonWhere,
              include: lessonInclude,
            },
          ],
        },
      ],
    });

    return rows.map((row) => {
      const plain = row.get({ plain: true });
      if (plain.employeeSubject) {
        plain.employeeSubject = toEmployeeSubject(plain.employeeSubject);
      }
      return plain;
    });
  } catch (error) {
    console.error('Error fetching lesson details:', error);
    throw error;
  }
}

export async function getSimpleLessonList(whereClause) {
  try {
    return await scoped(model.lessonModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: whereClause,
      include: [lectureWindowInclude],
    });
  } catch (error) {
    console.error("Error fetching simple lesson list:", error);
    throw error;
  }
}

/**
 * One week of published date-wise classes for a teacher + subject + course + session.
 */
export async function getTeacherWeekDateWiseCells({
  userId,
  courseId,
  sessionId,
  subjectId,
  startDate,
  endDate,
}) {
  const dateConditions = [];
  if (startDate != null) {
    dateConditions.push(
      Sequelize.where(
        Sequelize.fn('DATE', Sequelize.col('time_table_cell_date_wise.date')),
        { [Op.gte]: startDate },
      ),
    );
  }
  if (endDate != null) {
    dateConditions.push(
      Sequelize.where(
        Sequelize.fn('DATE', Sequelize.col('time_table_cell_date_wise.date')),
        { [Op.lte]: endDate },
      ),
    );
  }

  return model.timeTableCellDateWiseModel.findAll({
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
    where: dateConditions.length > 0 ? { [Op.and]: dateConditions } : {},
    include: [
      {
        model: model.timeTableCellTeachersDateWiseModel,
        as: 'timeTableCellTeachersDateWise',
        required: true,
        where: { userId: Number(userId) },
        attributes: ['userId', 'teacherType', 'isAttendence'],
      },
      {
        model: model.classRoomModel,
        as: 'classRoom',
        required: false,
        attributes: ['classRoomSectionId', 'roomNumber'],
      },
      {
        model: model.timeTableCellModel,
        as: 'timeTableCell',
        required: true,
        where: { subjectId: Number(subjectId) },
        attributes: [
          'timeTableCellId',
          'timeTableRoutineId',
          'timeTableCreationId',
          'day',
          'period',
          'subjectId',
          'timeTableType',
        ],
        include: [
          {
            model: model.subjectModel,
            as: 'timeTableSubject',
            attributes: ['subjectId', 'subjectName'],
            required: false,
          },
          {
            model: model.timeTableStructurePeriodsModel,
            as: 'timeTablecreation',
            attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime'],
            required: false,
          },
          {
            model: model.timeTableRoutineModel,
            as: 'timeTableRoutine',
            required: true,
            where: {
              courseId: Number(courseId),
              isPublish: true,
            },
            attributes: [
              'timeTableRoutineId',
              'startingDate',
              'endingDate',
              'isPublish',
              'timeTableType',
              'classSectionTermId',
              'courseId',
            ],
            include: [
              timeTableRoutineClassSectionInclude({
                termRequired: true,
                sectionRequired: true,
                sectionWhere: {
                  sessionId: Number(sessionId),
                  courseId: Number(courseId),
                  ...buildScope(model.classSectionModel),
                },
                termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
                sectionAttributes: ['classSectionsId', 'section', 'year', 'sessionId', 'courseId'],
              }),
            ],
          },
        ],
      },
    ],
    order: [['date', 'ASC'], ['timeTableCellDateWiseId', 'ASC']],
  });
}

/**
 * Compact lesson/topic/subtopic/window names for date-wise cells.
 */
export async function getLessonPlanSummariesByDateWiseIds(timeTableCellDateWiseIds) {
  if (!timeTableCellDateWiseIds || timeTableCellDateWiseIds.length === 0) {
    return [];
  }

  const ids = [];
  for (const id of timeTableCellDateWiseIds) {
    ids.push(Number(id));
  }

  return scoped(model.lessonMappingModel).findAll({
    attributes: [
      'lessonMappingId',
      'topicId',
      'timeTableCellDateWiseId',
      'timeTableCellId',
      'date',
      'completeDate',
      'note',
      'lectureUrl',
      'file',
      'status',
    ],
    where: {
      timeTableCellDateWiseId: { [Op.in]: ids },
    },
    include: [
      {
        model: model.topicModel,
        as: 'mappingTopic',
        required: true,
        attributes: ['topicId', 'name', 'lessonId'],
        include: [
          {
            model: model.lessonModel,
            as: 'lessonTopic',
            required: true,
            attributes: ['lessonId', 'name', 'lectureWindowId'],
            where: buildScope(model.lessonModel),
            include: [
              {
                model: model.lectureWindowModel,
                as: 'lectureWindow',
                required: false,
                attributes: ['lectureWindowId', 'name'],
              },
            ],
          },
          {
            model: model.subTopicModel,
            as: 'subTopic',
            required: false,
            attributes: ['subTopicId', 'name'],
          },
        ],
      },
    ],
    order: [['lessonMappingId', 'ASC']],
  });
}

/**
 * Lesson mappings for progress table — filtered by teacher + subject (+ optional course/session/lesson).
 */
export async function getMappedLessonRows({
  userId,
  subjectId,
  courseId,
  sessionId,
  lessonId,
  status,
}) {
  const lessonWhere = {
    ...buildScope(model.lessonModel),
  };
  if (subjectId != null) {
    lessonWhere.subjectId = Number(subjectId);
  }
  if (lessonId != null) {
    lessonWhere.lessonId = Number(lessonId);
  }

  const mappingWhere = {};
  if (status != null && status !== '') {
    mappingWhere.status = status;
  }

  const routineWhere = {
    ...buildScope(model.timeTableRoutineModel),
  };
  if (courseId != null) {
    routineWhere.courseId = Number(courseId);
  }

  const sectionWhere = {
    ...buildScope(model.classSectionModel),
  };
  if (sessionId != null) {
    sectionWhere.sessionId = Number(sessionId);
  }
  if (courseId != null) {
    sectionWhere.courseId = Number(courseId);
  }

  return scoped(model.lessonMappingModel).findAll({
    attributes: [
      'lessonMappingId',
      'topicId',
      'timeTableCellDateWiseId',
      'timeTableCellId',
      'date',
      'completeDate',
      'note',
      'lectureUrl',
      'file',
      'status',
    ],
    where: mappingWhere,
    include: [
      {
        model: model.topicModel,
        as: 'mappingTopic',
        required: true,
        attributes: ['topicId', 'name', 'description', 'lessonId'],
        include: [
          {
            model: model.lessonModel,
            as: 'lessonTopic',
            required: true,
            attributes: ['lessonId', 'name', 'description', 'subjectId', 'sessionId', 'userId', 'lectureWindowId'],
            where: lessonWhere,
            include: [
              {
                model: model.subjectModel,
                as: 'lessonSubject',
                attributes: ['subjectId', 'subjectName', 'subjectCode'],
                required: false,
              },
              {
                model: model.lectureWindowModel,
                as: 'lectureWindow',
                required: false,
                attributes: ['lectureWindowId', 'name'],
              },
            ],
          },
          {
            model: model.subTopicModel,
            as: 'subTopic',
            required: false,
            attributes: ['subTopicId', 'name', 'description', 'topicId'],
          },
        ],
      },
      {
        model: model.timeTableCellDateWiseModel,
        as: 'timeTableCellDateWise',
        required: true,
        attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
        include: [
          {
            model: model.timeTableCellTeachersDateWiseModel,
            as: 'timeTableCellTeachersDateWise',
            required: true,
            where: { userId: Number(userId) },
            attributes: ['userId', 'teacherType', 'isAttendence'],
          },
          {
            model: model.classRoomModel,
            as: 'classRoom',
            required: false,
            attributes: ['classRoomSectionId', 'roomNumber'],
          },
          {
            model: model.timeTableCellModel,
            as: 'timeTableCell',
            required: true,
            attributes: [
              'timeTableCellId',
              'day',
              'period',
              'timeTableType',
              'subjectId',
              'timeTableCreationId',
              'timeTableRoutineId',
            ],
            include: [
              {
                model: model.timeTableStructurePeriodsModel,
                as: 'timeTablecreation',
                attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime'],
                required: false,
              },
              {
                model: model.timeTableRoutineModel,
                as: 'timeTableRoutine',
                required: true,
                where: routineWhere,
                attributes: [
                  'timeTableRoutineId',
                  'classSectionTermId',
                  'startingDate',
                  'endingDate',
                  'courseId',
                  'isPublish',
                ],
                include: [
                  timeTableRoutineClassSectionInclude({
                    termRequired: true,
                    sectionRequired: true,
                    sectionWhere,
                    termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
                    sectionAttributes: ['classSectionsId', 'section', 'year', 'sessionId', 'courseId'],
                  }),
                ],
              },
            ],
          },
        ],
      },
    ],
    order: [
      ['date', 'ASC'],
      ['lessonMappingId', 'ASC'],
    ],
  });
}
