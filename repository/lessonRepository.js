import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import { classSectionTermsInclude } from "../utility/classSectionIncludes.js";
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
            },
            {
              model: model.employeeModel, as: "employeeDetails",
              attributes: ["employeeName", "employeeCode", "pickColor", "userId"],
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
                  attributes: ["employeeName", "employeeCode", "pickColor", "userId"],
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
    let parsedEmployeeId = userId != null && userId !== '' ? Number(userId) : null;
    let actualEmployeeId = null;
    if (parsedEmployeeId) {
      const emp = await scoped(model.employeeModel).findOne({
        attributes: ["employeeId"],
        where: { userId: parsedEmployeeId }
      });
      if (emp) {
        actualEmployeeId = emp.employeeId;
      }
    }

    const parsedSessionId = sessionId != null && sessionId !== ''
      ? Number(sessionId)
      : null;
    const parsedSubjectId = subjectId != null && subjectId !== '' && subjectId !== 'undefined'
      ? Number(subjectId)
      : null;
    const hasEmployeeId = Number.isInteger(parsedEmployeeId) && parsedEmployeeId > 0;
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

    if (hasEmployeeId && hasSubjectId) {
      const lessons = await scoped(model.lessonModel).findAll({
        where: {
          userId: parsedEmployeeId,
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
        userId: parsedEmployeeId,
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
      ...(hasEmployeeId && parsedEmployeeId && { userId: parsedEmployeeId }),
      ...(hasSubjectId && { subjectId: parsedSubjectId }),
    };

    const rows = await scoped(model.teacherSubjectMappingModel).findAll({
      where: {
        ...(hasEmployeeId && { employeeId: actualEmployeeId }),
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
