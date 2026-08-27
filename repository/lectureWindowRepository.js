import * as model from "../models/index.js";
import { Op } from "sequelize";
import { scoped } from "../utility/scoped.js";

const excludeMeta = ["createdAt", "updatedAt", "createdBy", "updatedBy"];

function buildLectureWindowIncludes(filters = {}) {
  const lessonWhere = filters.lessonId != null
    ? { lessonId: Number(filters.lessonId) }
    : undefined;

  return [
    {
      model: model.subjectModel,
      as: "lectureWindowSubject",
      attributes: ["subjectId", "subjectName", "courseId"],
    },
    {
      model: model.employeeModel,
      as: "lectureWindowEmployee",
      attributes: ["userId", "employeeId", "employeeName", "employeeCode", "pickColor"],
      required: false,
    },
    {
      model: model.sessionModel,
      as: "lectureWindowSession",
      attributes: ["sessionId", "sessionName", "startingDate", "endingDate"],
    },
    {
      model: model.lessonModel,
      as: "lessons",
      attributes: { exclude: excludeMeta },
      required: filters.lessonId != null,
      where: lessonWhere,
      include: [
        {
          model: model.topicModel,
          as: "topicSession",
          attributes: {
            exclude: [...excludeMeta, "specialization_id", "course_id"],
          },
          required: false,
        },
      ],
    },
  ];
}

export async function addLectureWindow(data, transaction) {
  return scoped(model.lectureWindowModel).create(data, { transaction });
}

export async function getLectureWindows(filters = {}) {
  const where = {
    academicYearId: Number(filters.academicYearId),
  };

  if (filters.subjectId != null) {
    where.subjectId = Number(filters.subjectId);
  }
  if (filters.userId != null) {
    where.userId = Number(filters.userId);
  }
  if (filters.sessionId != null) {
    where.sessionId = Number(filters.sessionId);
  }

  return scoped(model.lectureWindowModel).findAll({
    attributes: { exclude: excludeMeta },
    where,
    include: buildLectureWindowIncludes(filters),
    order: [
      ["startDate", "DESC"],
      ["lectureWindowId", "DESC"],
      [{ model: model.lessonModel, as: "lessons" }, "lessonId", "ASC"],
    ],
  });
}

export async function getLectureWindowById(lectureWindowId, academicYearId, userId) {
  const where = {
    lectureWindowId: Number(lectureWindowId),
    academicYearId: Number(academicYearId),
  };
  if (userId != null) {
    where.userId = Number(userId);
  }
  return scoped(model.lectureWindowModel).findOne({
    attributes: { exclude: excludeMeta },
    where,
    include: buildLectureWindowIncludes(),
    order: [[{ model: model.lessonModel, as: "lessons" }, "lessonId", "ASC"]],
  });
}

export async function updateLectureWindow(lectureWindowId, data, academicYearId, userId) {
  const where = {
    lectureWindowId: Number(lectureWindowId),
    academicYearId: Number(academicYearId),
  };
  if (userId != null) {
    where.userId = Number(userId);
  }

  const existing = await scoped(model.lectureWindowModel).findOne({
    where,
    attributes: ["lectureWindowId"],
  });
  if (!existing) {
    return null;
  }

  await scoped(model.lectureWindowModel).update(data, {
    where,
  });

  return getLectureWindowById(lectureWindowId, academicYearId, userId);
}

export async function deleteLectureWindow(lectureWindowId, academicYearId, userId, transaction) {
  const where = {
    lectureWindowId: Number(lectureWindowId),
    academicYearId: Number(academicYearId),
  };
  if (userId != null) {
    where.userId = Number(userId);
  }
  const deleted = await scoped(model.lectureWindowModel).destroy({
    where,
    transaction,
  });
  return deleted > 0;
}

export async function linkLessonsToWindow(lectureWindowId, lessonIds, updatedBy, transaction) {
  const [updatedCount] = await scoped(model.lessonModel).update(
    { lectureWindowId: Number(lectureWindowId), updatedBy },
    {
      where: {
        lessonId: { [Op.in]: lessonIds.map(Number) },
      },
      transaction,
    },
  );
  return updatedCount;
}

export async function unlinkLessonsFromWindow(lessonIds, updatedBy, transaction) {
  const [updatedCount] = await scoped(model.lessonModel).update(
    { lectureWindowId: null, updatedBy },
    {
      where: {
        lessonId: { [Op.in]: lessonIds.map(Number) },
      },
      transaction,
    },
  );
  return updatedCount;
}
