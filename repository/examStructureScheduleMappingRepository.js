import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";

async function assertScopedExamSchedule(examScheduleId, options = {}) {
  const { transaction, attributes = ['examScheduleId'] } = options;
  return scoped(model.examScheduleModel).findOne({
    where: { examScheduleId },
    attributes,
    transaction,
  });
}

export async function addExamStructureSchedule(examDetailSchedule) {
  try {
    return await scoped(model.examStructureScheduleMappingModel).create(examDetailSchedule);
  } catch (error) {
    console.error("Error adding exam Structure Schedule:", error);
    throw error;
  }
}

export async function getExamStructureSchedule(examSetupTypeId) {
  const whereClause = {
    ...(examSetupTypeId && { examSetupTypeId }),
  };

  return await scoped(model.examSetupTypeModel).findAll({
    where: whereClause,
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [
      {
        model: model.syllabusDetailsModel,
        as: "syllabusDetailsExam",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
          {
            model: model.subjectModel,
            as: "syllabusSubject",
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
              {
                model: model.classSubjectMapperModel,
                as: "subjects",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                  {
                    model: model.teacherSubjectMappingModel,
                    as: "employeeSubject",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                      {
                        model: model.employeeModel,
                        as: "teacherEmployeeData",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                      },
                    ],
                  },
                  {
                    model: model.semesterModel,
                    as: "semestermapping",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                      {
                        model: model.studentModel,
                        as: "studentSemester",
                        attributes: ["studentId", "firstName", "scholarNumber", "enrollNumber"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: model.examSetupTypeTermModel,
        as: "examSetupTypeTerms",
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: model.examScheduleModel,
            as: "examSchedules",
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "answerSheetS3FileId"] },
          },
        ],
      },
    ],
  });
}

export async function findSubjectAcedmicYearId(subjectId) {
  const subject = await scoped(model.subjectModel).findByPk(subjectId, {
    attributes: ["acedmicYearId"],
  });
  return subject?.acedmicYearId ?? null;
}

export async function updateExamSchedule(examScheduleId, data) {
  try {
    const existing = await assertScopedExamSchedule(examScheduleId);
    if (!existing) {
      return [0];
    }
    return await scoped(model.examScheduleModel).update(data, {
      where: { examScheduleId },
    });
  } catch (error) {
    console.error("Error updating exam Schedule:", error.message);
    throw error;
  }
}

export async function deleteExamSchedule(examScheduleId) {
  try {
    const existing = await assertScopedExamSchedule(examScheduleId);
    if (!existing) {
      return false;
    }
    const deleted = await scoped(model.examScheduleModel).destroy({ where: { examScheduleId } });
    return deleted > 0;
  } catch (error) {
    console.error("Error deleting exam Schedule:", error);
    throw error;
  }
}

export async function publishExamSchedule(examSetupTypeId, data) {
  try {
    const existing = await scoped(model.examSetupTypeModel).findOne({
      where: { examSetupTypeId },
      attributes: ['examSetupTypeId'],
    });
    if (!existing) {
      return [0];
    }
    return await scoped(model.examSetupTypeModel).update(data, {
      where: { examSetupTypeId },
    });
  } catch (error) {
    console.error("Error updating exam Schedule:", error);
    throw error;
  }
}

export async function findConflictingExamForStudentCohort({
  examDate,
  startMinutes,
  endMinutes,
  sessionId,
  acedmicYearId,
  courseId,
  term,
  semesterId,
  excludeExamScheduleId,
}) {
  const examStartMinutesSql = "(TIME_TO_SEC(`exam_schedule`.`exam_time`) / 60)";
  const examEndMinutesSql = `(${examStartMinutesSql} + CAST(\`exam_schedule\`.\`duration\` AS UNSIGNED))`;

  return scoped(model.examScheduleModel).findOne({
    attributes: ["examScheduleId", "examDate", "examTime", "duration", "subjectId"],
    where: {
      examDate,
      sessionId,
      acedmicYearId,
      ...(semesterId != null && { semesterId }),
      ...(excludeExamScheduleId && {
        examScheduleId: { [Op.ne]: excludeExamScheduleId },
      }),
      [Op.and]: [
        sequelize.where(sequelize.literal(examEndMinutesSql), { [Op.gt]: startMinutes }),
        sequelize.where(sequelize.literal(examStartMinutesSql), { [Op.lt]: endMinutes }),
      ],
    },
    include: [
      {
        model: model.examSetupTypeTermModel,
        as: "examSetupTypeTerm",
        attributes: ["courseId", "term"],
        where: { courseId, term },
        required: true,
      },
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["subjectName"],
        required: false,
      },
    ],
    raw: true,
    nest: true,
  });
}

export async function addExamSchedule(examDetail) {
  try {
    return await scoped(model.examScheduleModel).create(examDetail);
  } catch (error) {
    console.error("Error adding exam schedule:", error.message);
    throw error;
  }
}

export async function getDetailByExamType(examSetupTypeId) {
  try {
    return await scoped(model.examSetupTypeModel).findOne({
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
  } catch (error) {
    console.error("Error fetching exam structure details:", error.message);
    throw error;
  }
}

export async function getExamDetailByStudentId(studentId) {
  try {
    return await scoped(model.studentModel).findOne({
      attributes: ["studentId", "semesterId", "firstName"],
      where: { studentId },
      include: [
        {
          model: model.semesterModel,
          as: "studentSemester",
          attributes: ["semesterId", "name"],
          include: [
            {
              model: model.examScheduleModel,
              as: "examSchedules",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "answerSheetS3FileId"] },
              include: [
                {
                  model: model.subjectModel,
                  as: "subjectSchedule",
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                  model: model.examSetupTypeModel,
                  as: "examSetupTypeSchedule",
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                  where: { isPublish: true },
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching exam structure details for student:", error.message);
    throw error;
  }
}

export async function getExamScheduleById(examScheduleId) {
  try {
    return await scoped(model.examScheduleModel).findByPk(examScheduleId, {
      include: [
        {
          model: model.subjectModel,
          as: "subjectSchedule",
        },
        {
          model: model.semesterModel,
          as: "semesterexam",
        },
        {
          model: model.examSetupTypeTermModel,
          as: "examSetupTypeTerm",
          include: [
            {
              model: model.examSetupTypeModel,
              as: "examSetupType",
            },
          ],
        },
        {
          model: model.acedmicYearModel,
          as: "acedmicYearSchedule",
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching exam schedule by id:", error.message);
    throw error;
  }
}

export async function getExamSetupTypeTermById(examSetupTypeTermId) {
  try {
    return await scoped(model.examSetupTypeTermModel).findByPk(examSetupTypeTermId);
  } catch (error) {
    console.error("Error fetching exam setup type term by id:", error.message);
    throw error;
  }
}

export async function findSubjectsWithSchedules(courseId, acedmicYearId, term, examSetupTypeTermId, sessionId) {
  return scoped(model.subjectModel).findAll({
    where: {
      ...buildScope(model.subjectModel),
      ...(courseId && { courseId }),
      ...(acedmicYearId && { acedmicYearId }),
      ...(term && { term }),
    },
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [
      {
        model: model.examScheduleModel,
        as: "scheduleSubject",
        required: false,
        where: {
          ...(sessionId && { sessionId }),
        },
        attributes: [
          "examScheduleId",
          "subjectId",
          "semesterId",
          "examSetupTypeTermId",
          "acedmicYearId",
          "sessionId",
          "examDate",
          "examTime",
          "type",
          "duration",
          "createdBy",
          "updatedBy",
        ],
        include: [
          {
            model: model.examSetupTypeTermModel,
            where: { examSetupTypeTermId },
            as: "examSetupTypeTerm",
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
        ],
      },
    ],
  });
}

export async function findRoomsByExamScheduleIds(examScheduleIds) {
  if (!examScheduleIds.length) {
    return [];
  }

  const scopedSchedules = await scoped(model.examScheduleModel).findAll({
    where: { examScheduleId: { [Op.in]: examScheduleIds } },
    attributes: ['examScheduleId'],
    raw: true,
  });
  const allowedIds = scopedSchedules.map((s) => s.examScheduleId);
  if (!allowedIds.length) {
    return [];
  }

  return model.examScheduleRoomCapacityModel.findAll({
    where: { examScheduleId: { [Op.in]: allowedIds } },
    attributes: [
      "examScheduleRoomCapacityId",
      "examScheduleId",
      "classRoomSectionId",
      "capacity",
      "columns",
      "orderKey",
    ],
    include: [
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["roomNumber"],
      },
    ],
    order: [["orderKey", "ASC"]],
    raw: true,
    nest: true,
  });
}

export async function countStudentsForTerm(courseId, acedmicYearId, term, sessionId) {
  try {
    return await scoped(model.studentModel).count({
      include: [
        {
          model: model.classSectionModel,
          as: "studentSections",
          required: true,
          attributes: [],
          where: {
            courseId,
            acedmicYearId,
            ...buildScope(model.classSectionModel),
            ...(sessionId && { sessionId }),
          },
          include: [
            {
              model: model.classModel,
              as: "classGroup",
              required: true,
              attributes: [],
              where: { term },
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching student count for term:", error.message);
    throw error;
  }
}

export async function findStudentsForTerm(courseId, acedmicYearId, term, sessionId) {
  try {
    return await scoped(model.studentModel).findAll({
      attributes: [
        "studentId",
        [
          sequelize.fn(
            "TRIM",
            sequelize.fn(
              "CONCAT_WS",
              " ",
              sequelize.col("students.first_name"),
              sequelize.col("students.middle_name"),
              sequelize.col("students.last_name"),
            ),
          ),
          "name",
        ],
        "enrollNumber",
        "scholarNumber",
        "fatherName",
        "email",
        "phoneNumber",
        "mobileNumber",
        [sequelize.col("studentSections->courseSection.course_name"), "courseName"],
        [
          sequelize.literal(
            "COALESCE(`studentSections->semesterDetail`.`name`, `studentSections->classGroup`.`class_name`, CONCAT('Term ', `studentSections->classGroup`.`term`))",
          ),
          "termName",
        ],
      ],
      include: [
        {
          model: model.classSectionModel,
          as: "studentSections",
          required: true,
          attributes: [],
          where: {
            courseId,
            acedmicYearId,
            ...buildScope(model.classSectionModel),
            ...(sessionId && { sessionId }),
          },
          include: [
            {
              model: model.courseModel,
              as: "courseSection",
              required: true,
              attributes: [],
            },
            {
              model: model.semesterModel,
              as: "semesterDetail",
              required: false,
              attributes: [],
            },
            {
              model: model.classModel,
              as: "classGroup",
              required: true,
              attributes: [],
              where: { term },
            },
          ],
        },
      ],
      order: [
        [sequelize.col("students.first_name"), "ASC"],
        [sequelize.col("students.student_id"), "ASC"],
      ],
      subQuery: false,
      raw: true,
    });
  } catch (error) {
    console.error("Error fetching students for term:", error.message);
    throw error;
  }
}
