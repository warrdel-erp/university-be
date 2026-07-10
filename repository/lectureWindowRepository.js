import * as model from "../models/index.js";
import { Op } from "sequelize";
import { scoped } from "../utility/scoped.js";

const excludeMeta = ["createdAt", "updatedAt", "createdBy", "updatedBy"];

const lessonAttributes = {
  exclude: excludeMeta,
};

const topicAttributes = {
  exclude: [
    ...excludeMeta,
    "specialization_id",
    "course_id",
  ],
};

const lectureWindowIncludes = [
  {
    model: model.subjectModel,
    as: "lectureWindowSubject",
    attributes: ["subjectId", "subjectName", "courseId"],
  },
  {
    model: model.employeeModel,
    as: "lectureWindowEmployee",
    attributes: ["employeeId", "employeeName", "employeeCode", "pickColor"],
  },
  {
    model: model.sessionModel,
    as: "lectureWindowSession",
    attributes: ["sessionId", "sessionName", "startingDate", "endingDate"],
  },
  {
    model: model.lessonModel,
    as: "windowLessons",
    attributes: lessonAttributes,
    required: false,
    include: [
      {
        model: model.topicModel,
        as: "topicSession",
        attributes: topicAttributes,
        required: false,
      },
    ],
  },
];

export async function addLectureWindow(data, transaction) {
  return scoped(model.lectureWindowModel).create(data, { transaction });
}

export async function getLectureWindows(filters = {}) {
  const where = {
    academicYearId: filters.academicYearId,
    ...(filters.subjectId && { subjectId: Number(filters.subjectId) }),
    ...(filters.employeeId && { employeeId: Number(filters.employeeId) }),
    ...(filters.sessionId && { sessionId: Number(filters.sessionId) }),
  };

  const lessonInclude = {
    model: model.lessonModel,
    as: "windowLessons",
    attributes: lessonAttributes,
    required: Boolean(filters.lessonId),
    where: filters.lessonId
      ? { lessonId: Number(filters.lessonId) }
      : undefined,
    include: [
      {
        model: model.topicModel,
        as: "topicSession",
        attributes: topicAttributes,
        required: false,
      },
    ],
  };

  return scoped(model.lectureWindowModel).findAll({
    attributes: { exclude: excludeMeta },
    where,
    include: [
      {
        model: model.subjectModel,
        as: "lectureWindowSubject",
        attributes: ["subjectId", "subjectName", "courseId"],
      },
      {
        model: model.employeeModel,
        as: "lectureWindowEmployee",
        attributes: ["employeeId", "employeeName", "employeeCode", "pickColor"],
      },
      {
        model: model.sessionModel,
        as: "lectureWindowSession",
        attributes: ["sessionId", "sessionName", "startingDate", "endingDate"],
      },
      lessonInclude,
    ],
    order: [["startDate", "DESC"], ["lectureWindowId", "DESC"]],
  });
}

export async function getLectureWindowById(lectureWindowId, academicYearId) {
  return scoped(model.lectureWindowModel).findOne({
    attributes: { exclude: excludeMeta },
    where: {
      lectureWindowId: Number(lectureWindowId),
      academicYearId: Number(academicYearId),
    },
    include: lectureWindowIncludes,
  });
}

export async function updateLectureWindow(lectureWindowId, data, academicYearId) {
  const existing = await scoped(model.lectureWindowModel).findOne({
    where: {
      lectureWindowId: Number(lectureWindowId),
      academicYearId: Number(academicYearId),
    },
    attributes: ["lectureWindowId"],
  });
  if (!existing) {
    return null;
  }

  await scoped(model.lectureWindowModel).update(data, {
    where: {
      lectureWindowId: Number(lectureWindowId),
      academicYearId: Number(academicYearId),
    },
  });

  return getLectureWindowById(lectureWindowId, academicYearId);
}

export async function deleteLectureWindow(lectureWindowId, academicYearId, transaction) {
  const deleted = await scoped(model.lectureWindowModel).destroy({
    where: {
      lectureWindowId: Number(lectureWindowId),
      academicYearId: Number(academicYearId),
    },
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
