import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";
import { getStudentCountsByGroups } from "./examScheduleRepository.js";
import sequelize from "../database/sequelizeConfig.js";

export async function createAssignment(data, options = {}) {
  return scoped(model.examInvigilatorAssignmentModel).create(data, {
    transaction: options.transaction,
  });
}

export async function updateAssignment(id, data, options = {}) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) {
    return [0];
  }
  return scoped(model.examInvigilatorAssignmentModel).update(data, {
    where: { examInvigilatorAssignmentId: parsedId },
    transaction: options.transaction,
  });
}

export async function getAssignmentById(id, options = {}) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) {
    return null;
  }
  return scoped(model.examInvigilatorAssignmentModel).findOne({
    where: { examInvigilatorAssignmentId: parsedId },
    attributes: [
      "examInvigilatorAssignmentId",
      "universityId",
      "instituteId",
      "academicYearId",
      "examinationSessionSlotId",
      "examDate",
      "classRoomSectionId",
      "userId",
      "role",
      "assignedBy",
      "createdBy",
      "updatedBy",
      "createdAt",
      "updatedAt",
    ],
    include: [
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        attributes: [
          "examinationSessionSlotId",
          "slotNumber",
          "startTime",
          "endTime",
        ],
        where: buildScope(model.examinationSessionSlotModel),
        required: false,
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber"],
        where: buildScope(model.classRoomModel),
        required: false,
      },
      {
        model: model.users,
        as: "user",
        attributes: ["userId", "userName", "email"],
      },
      {
        model: model.users,
        as: "assignedByUser",
        attributes: ["userId", "userName"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function getAssignments(filters = {}, options = {}) {
  const {
    examinationSessionSlotId,
    examDate,
    classRoomSectionId,
    userId,
    role,
    status,
  } = filters;

  const whereClause = {};

  if (
    examinationSessionSlotId !== undefined &&
    examinationSessionSlotId !== null
  ) {
    const val = Number(examinationSessionSlotId);
    if (!isNaN(val)) {
      whereClause.examinationSessionSlotId = val;
    }
  }
  if (examDate) {
    whereClause.examDate = examDate;
  }
  if (classRoomSectionId !== undefined && classRoomSectionId !== null) {
    const val = Number(classRoomSectionId);
    if (!isNaN(val)) {
      whereClause.classRoomSectionId = val;
    }
  }
  if (userId !== undefined && userId !== null) {
    const val = Number(userId);
    if (!isNaN(val)) {
      whereClause.userId = val;
    }
  }
  if (role) {
    whereClause.role = role;
  }

  return scoped(model.examInvigilatorAssignmentModel).findAll({
    where: whereClause,
    attributes: [
      "examInvigilatorAssignmentId",
      "universityId",
      "instituteId",
      "academicYearId",
      "examinationSessionSlotId",
      "examDate",
      "classRoomSectionId",
      "userId",
      "role",
      "assignedBy",
      "createdBy",
      "updatedBy",
      "createdAt",
      "updatedAt",
    ],
    include: [
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        attributes: [
          "examinationSessionSlotId",
          "slotNumber",
          "startTime",
          "endTime",
        ],
        where: buildScope(model.examinationSessionSlotModel),
        required: false,
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber"],
        where: buildScope(model.classRoomModel),
        required: false,
      },
      {
        model: model.users,
        as: "user",
        attributes: ["userId", "userName", "email"],
      },
      {
        model: model.users,
        as: "assignedByUser",
        attributes: ["userId", "userName"],
      },
    ],
    order: [["createdAt", "DESC"]],
    transaction: options.transaction,
  });
}

export async function deleteAssignment(id, options = {}) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) {
    return 0;
  }
  return scoped(model.examInvigilatorAssignmentModel).destroy({
    where: { examInvigilatorAssignmentId: parsedId },
    transaction: options.transaction,
  });
}

export async function checkActiveAssignmentConflict(
  userId,
  examDate,
  slotId,
  excludeId = null,
  options = {},
) {
  const parsedUserId = Number(userId);
  const parsedSlotId = Number(slotId);
  if (isNaN(parsedUserId) || isNaN(parsedSlotId)) {
    return null;
  }

  const where = {
    userId: parsedUserId,
    examDate,
    examinationSessionSlotId: parsedSlotId,
  };

  if (excludeId) {
    const parsedExcludeId = Number(excludeId);
    if (!isNaN(parsedExcludeId)) {
      where.examInvigilatorAssignmentId = { [Op.ne]: parsedExcludeId };
    }
  }

  return scoped(model.examInvigilatorAssignmentModel).findOne({
    where,
    attributes: ["examInvigilatorAssignmentId"],
    transaction: options.transaction,
  });
}

export async function getScheduledRoomsWithDetails(
  examinationSessionId,
  filters = {},
  options = {},
) {
  const parsedSessionId = Number(examinationSessionId);
  if (isNaN(parsedSessionId)) {
    return [];
  }

  const { examDate, examinationSessionSlotId } = filters;
  const scheduleWhere = {
    examinationSessionId: parsedSessionId,
    ...buildScope(model.examScheduleModel),
  };
  if (examDate) {
    scheduleWhere.examDate = examDate;
  }
  if (
    examinationSessionSlotId !== undefined &&
    examinationSessionSlotId !== null
  ) {
    const parsedSlotId = Number(examinationSessionSlotId);
    if (!isNaN(parsedSlotId)) {
      scheduleWhere.examinationSessionSlotId = parsedSlotId;
    }
  }

  const capacities = await scoped(model.examScheduleRoomCapacityModel).findAll({
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        where: scheduleWhere,
        required: true,
        attributes: ["examDate", "examinationSessionSlotId"],
        include: [
          {
            model: model.examinationSessionSlotModel,
            as: "examinationSessionSlot",
            where: buildScope(model.examinationSessionSlotModel),
            required: true,
            attributes: [
              "examinationSessionSlotId",
              "slotNumber",
              "startTime",
              "endTime",
            ],
          },
        ],
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        where: buildScope(model.classRoomModel),
        required: true,
        attributes: ["classRoomSectionId", "roomNumber"],
      },
    ],
    attributes: ["classRoomSectionId"],
    transaction: options.transaction,
  });

  const seen = new Set();
  const result = [];
  for (const cap of capacities) {
    const plain = cap.get({ plain: true });
    const room = plain.classRoom;
    const sched = plain.examSchedule;
    const slot = sched?.examinationSessionSlot;

    if (!room || !sched || !slot) continue;

    const key = `${sched.examDate}_${sched.examinationSessionSlotId}_${plain.classRoomSectionId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      classRoomSectionId: plain.classRoomSectionId,
      roomNumber: room.roomNumber,
      examDate: sched.examDate,
      examinationSessionSlotId: sched.examinationSessionSlotId,
      slotNumber: slot.slotNumber,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }

  return result;
}

export async function getActiveAssignmentsWithUsers(slots, options = {}) {
  if (!slots.length) return [];

  const examDates = [...new Set(slots.map((s) => s.examDate))];
  const slotIds = [];
  for (const s of slots) {
    const parsed = Number(s.examinationSessionSlotId);
    if (!isNaN(parsed)) {
      slotIds.push(parsed);
    }
  }

  if (examDates.length === 0 || slotIds.length === 0) {
    return [];
  }

  return scoped(model.examInvigilatorAssignmentModel).findAll({
    where: {
      examDate: { [Op.in]: examDates },
      examinationSessionSlotId: { [Op.in]: slotIds },
      status: { [Op.notIn]: ["CANCELLED", "DECLINED"] },
    },
    attributes: [
      "examInvigilatorAssignmentId",
      "examinationSessionSlotId",
      "examDate",
      "classRoomSectionId",
      "userId",
      "role",
      "status",
    ],
    include: [
      {
        model: model.users,
        as: "user",
        required: true,
        attributes: ["userId", "userName"],
      },
    ],
    transaction: options.transaction,
  });
}


export async function getSchedulesFiltered(filters = {}, pagination = {}, options = {}) {
  const { courseId, sessionId, term, examDate, examinationSessionSlotId } = filters;
  const { page, limit } = pagination;

  const examScheduleWhere = {
    ...buildScope(model.examScheduleModel),
  };
  if (examDate) {
    examScheduleWhere.examDate = examDate;
  }
  if (examinationSessionSlotId !== undefined && examinationSessionSlotId !== null) {
    const val = Number(examinationSessionSlotId);
    if (!isNaN(val)) {
      examScheduleWhere.examinationSessionSlotId = val;
    }
  }
  if (sessionId !== undefined && sessionId !== null) {
    const val = Number(sessionId);
    if (!isNaN(val)) {
      examScheduleWhere.sessionId = val;
    }
  }
  if (term !== undefined && term !== null) {
    const val = Number(term);
    if (!isNaN(val)) {
      examScheduleWhere.term = val;
    }
  }

  const subjectWhere = {
    ...buildScope(model.subjectModel),
  };
  if (courseId !== undefined && courseId !== null) {
    const val = Number(courseId);
    if (!isNaN(val)) {
      subjectWhere.courseId = val;
    }
  }

  const limitNum = Number(limit) || 10;
  const pageNum = Number(page) || 1;
  const offsetNum = (pageNum - 1) * limitNum;

  return scoped(model.examScheduleModel).findAndCountAll({
    where: examScheduleWhere,
    attributes: [
      "examScheduleId",
      "examDate",
      "term",
      "academicYearId",
      "sessionId",
      "examinationSessionSlotId",
      "subjectId",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
        where: subjectWhere,
        required: courseId !== undefined && courseId !== null,
      },
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        attributes: [
          "examinationSessionSlotId",
          "slotNumber",
          "startTime",
          "endTime",
        ],
        where: buildScope(model.examinationSessionSlotModel),
        required: false,
      },
    ],
    limit: limitNum,
    offset: offsetNum,
    order: [["examDate", "ASC"], ["examinationSessionSlotId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function getRoomCapacitiesForSchedules(scheduleIds, options = {}) {
  return scoped(model.examScheduleRoomCapacityModel).findAll({
    where: {
      examScheduleId: { [Op.in]: scheduleIds },
      ...buildScope(model.examScheduleRoomCapacityModel),
    },
    attributes: [
      "examScheduleRoomCapacityId",
      "classRoomSectionId",
      "examScheduleId",
      "capacity",
      "columns",
      "orderKey",
    ],
    include: [
      {
        model: model.classRoomModel,
        as: "classRoom",
        required: true,
        attributes: [
          "classRoomSectionId",
          "roomNumber",
          "capacity",
          "examCapacity",
        ],
        where: buildScope(model.classRoomModel),
      },
    ],
    transaction: options.transaction,
  });
}

export async function getAssignmentsForRooms(classRoomSectionIds, examDates, slotIds, options = {}) {
  return scoped(model.examInvigilatorAssignmentModel).findAll({
    where: {
      classRoomSectionId: { [Op.in]: classRoomSectionIds },
      examDate: { [Op.in]: examDates },
      examinationSessionSlotId: { [Op.in]: slotIds },
      ...buildScope(model.examInvigilatorAssignmentModel),
    },
    attributes: [
      "examInvigilatorAssignmentId",
      "classRoomSectionId",
      "examDate",
      "examinationSessionSlotId",
      "userId",
      "role",
    ],
    include: [
      {
        model: model.users,
        as: "user",
        attributes: ["userId", "userName", "email"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function getDuplicateChecks(classRoomSectionIds, examDates, slotIds, options = {}) {
  return scoped(model.examScheduleRoomCapacityModel).findAll({
    attributes: [
      "classRoomSectionId",
      [sequelize.col("examSchedule.exam_date"), "examDate"],
      [
        sequelize.col("examSchedule.examination_session_slot_id"),
        "examinationSessionSlotId",
      ],
      [
        sequelize.fn(
          "COUNT",
          sequelize.fn("DISTINCT", sequelize.col("exam_schedule_room_capacity.exam_schedule_id")),
        ),
        "scheduleCount",
      ],
    ],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        required: true,
        attributes: [],
        where: {
          examDate: { [Op.in]: examDates },
          examinationSessionSlotId: { [Op.in]: slotIds },
        },
      },
    ],
    where: {
      classRoomSectionId: { [Op.in]: classRoomSectionIds },
      ...buildScope(model.examScheduleRoomCapacityModel),
    },
    group: [
      "exam_schedule_room_capacity.class_room_section_id",
      "examSchedule.exam_date",
      "examSchedule.examination_session_slot_id",
    ],
    raw: true,
    transaction: options.transaction,
  });
}

export async function getSeatCounts(roomCapacityIds, options = {}) {
  return scoped(model.studentExamSeatModel).findAll({
    attributes: [
      "examScheduleRoomCapacityId",
      [
        sequelize.fn("COUNT", sequelize.col("student_exam_seat_id")),
        "studentCount",
      ],
    ],
    where: {
      examScheduleRoomCapacityId: { [Op.in]: roomCapacityIds },
      ...buildScope(model.studentExamSeatModel),
    },
    group: ["examScheduleRoomCapacityId"],
    raw: true,
  });
}

export async function getAssignmentsByUserId(
  userId,
  examinationSessionId,
  options = {},
) {
  const parsedUserId = Number(userId);
  if (isNaN(parsedUserId)) return null;

  const slotWhere = {
    ...buildScope(model.examinationSessionSlotModel),
  };

  if (examinationSessionId !== undefined && examinationSessionId !== null && examinationSessionId !== "") {
    const parsedSessionId = Number(examinationSessionId);
    if (!isNaN(parsedSessionId)) {
      slotWhere.examinationSessionId = parsedSessionId;
    }
  }

  const [userVal, assignments] = await Promise.all([
    model.users.findOne({
      where: { userId: parsedUserId },
      attributes: ["userId", "userName", "email"],
      transaction: options.transaction,
    }),
    scoped(model.examInvigilatorAssignmentModel).findAll({
      where: { userId: parsedUserId },
      attributes: [
        "examInvigilatorAssignmentId",
        "universityId",
        "instituteId",
        "academicYearId",
        "examinationSessionSlotId",
        "examDate",
        "classRoomSectionId",
        "userId",
        "role",
        "assignedBy",
        "createdBy",
        "updatedBy",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: model.examinationSessionSlotModel,
          as: "examinationSessionSlot",
          attributes: [
            "examinationSessionSlotId",
            "slotNumber",
            "startTime",
            "endTime",
            "examinationSessionId",
          ],
          where: slotWhere,
          required: true,
        },
        {
          model: model.classRoomModel,
          as: "classRoom",
          attributes: ["classRoomSectionId", "roomNumber"],
          where: buildScope(model.classRoomModel),
          required: false,
        },
        {
          model: model.users,
          as: "assignedByUser",
          attributes: ["userId", "userName"],
        },
      ],
      order: [["createdAt", "DESC"]],
      transaction: options.transaction,
    }),
  ]);

  if (!userVal) return null;

  return {
    userId: userVal.userId,
    userName: userVal.userName,
    email: userVal.email,
    totalAssignedRooms: assignments.length,
    assignments,
  };
}

export async function findScheduleById(examScheduleId, options = {}) {
  return scoped(model.examScheduleModel).findOne({
    where: { examScheduleId },
    attributes: [
      "examScheduleId",
      "examDate",
      "term",
      "academicYearId",
      "sessionId",
      "examinationSessionSlotId",
      "subjectId",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
        where: buildScope(model.subjectModel),
        required: false,
      },
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        attributes: [
          "examinationSessionSlotId",
          "slotNumber",
          "startTime",
          "endTime",
        ],
        where: buildScope(model.examinationSessionSlotModel),
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findRoomCapacitiesBySchedule(examScheduleId, options = {}) {
  return scoped(model.examScheduleRoomCapacityModel).findAll({
    where: {
      examScheduleId,
      ...buildScope(model.examScheduleRoomCapacityModel),
    },
    attributes: [
      "examScheduleRoomCapacityId",
      "classRoomSectionId",
      "examScheduleId",
      "capacity",
      "columns",
      "orderKey",
    ],
    include: [
      {
        model: model.classRoomModel,
        as: "classRoom",
        required: true,
        attributes: [
          "classRoomSectionId",
          "roomNumber",
          "capacity",
          "examCapacity",
        ],
        where: buildScope(model.classRoomModel),
      },
    ],
    transaction: options.transaction,
  });
}

export async function getAssignmentsByDateAndSlot(examDate, examinationSessionSlotId, options = {}) {
  return scoped(model.examInvigilatorAssignmentModel).findAll({
    where: {
      examDate,
      examinationSessionSlotId,
      ...buildScope(model.examInvigilatorAssignmentModel),
    },
    attributes: ["userId"],
    raw: true,
    transaction: options.transaction,
  });
}

export async function getAllEmployeesWithUser(options = {}) {
  return scoped(model.employeeModel).findAll({
    attributes: ["employeeId", "userId"],
    include: [
      {
        model: model.users,
        as: "user",
        attributes: ["userId", "userName", "email"],
        required: true,
        where: buildScope(model.users),
      },
    ],
    where: buildScope(model.employeeModel),
    transaction: options.transaction,
  });
}


