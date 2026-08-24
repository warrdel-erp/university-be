import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

import { findRoomsByExamScheduleIds } from "./examStructureScheduleMappingRepository.js";
import { countStudentsForTerm } from "./examStructureScheduleMappingRepository.js";

async function countStudentsForSubject(subjectId, sessionId, options = {}) {
  const subject = await scoped(model.subjectModel).findOne({
    where: { subjectId },
    attributes: ["courseId", "term", "academicYearId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!subject) {
    return 0;
  }

  const classSectionWhere = {
    courseId: subject.courseId,
    academicYearId: subject.academicYearId,
  };
  if (sessionId) {
    classSectionWhere.sessionId = sessionId;
  }

  return await scoped(model.studentModel).count({
    distinct: true,
    col: "student_id",
    where: {
      courseId: subject.courseId,
      ...(sessionId && { sessionId }),
    },
    include: [
      {
        model: model.classSectionTermModel,
        as: "studentClassSectionTerm",
        required: true,
        attributes: [],
        where: { term: subject.term },
        include: [
          {
            model: model.classSectionModel,
            as: "classSection",
            required: true,
            attributes: [],
            where: classSectionWhere,
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

export async function getMaxSlotNumber(examinationSessionId, options = {}) {
  const highestSlot = await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionId: Number(examinationSessionId) },
    order: [["slotNumber", "DESC"]],
    attributes: ["slotNumber"],
    transaction: options.transaction,
    paranoid: false,
    raw: true,
  });
  return highestSlot && highestSlot.slotNumber ? Number(highestSlot.slotNumber) : 0;
}

export async function createExaminationSessionSlot(slotData, options = {}) {
  return await scoped(model.examinationSessionSlotModel).create(slotData, {
    transaction: options.transaction,
  });
}

export async function getExaminationSessionSlots(
  examinationSessionId,
  date,
  options = {}
) {
  const slots = await scoped(model.examinationSessionSlotModel).findAll({
    where: {
      examinationSessionId: Number(examinationSessionId),
    },
    order: [["slotNumber", "ASC"]],
    raw: true,
    transaction: options.transaction,
  });

  if (!slots.length) {
    return [];
  }

  const slotIds = slots.map((slot) => slot.examinationSessionSlotId);

  const scheduleWhere = {
    examinationSessionSlotId: {
      [Op.in]: slotIds,
    },
  };

  if (date) {
    scheduleWhere.examDate = date;
  }

  const schedules = await scoped(model.examScheduleModel).findAll({
    where: scheduleWhere,
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: [
          "subjectId",
          "subjectName",
          "subjectCode",
          "courseId",
        ],
        include: [
          {
            model: model.courseModel,
            as: "course",
            attributes: ["courseName", "termType"],
          }
        ]
      },
    ],
    order: [
      ["examDate", "ASC"],
      ["examTime", "ASC"],
    ],
    transaction: options.transaction,
  });

  if (!schedules.length) {
    return slots.map((slot) => ({
      ...slot,
      schedules: [],
    }));
  }

  const examScheduleIds = schedules.map(
    (schedule) => schedule.examScheduleId
  );

  const roomRows = await findRoomsByExamScheduleIds(examScheduleIds);

  const roomNumbersMap = new Map();
  const roomCapacityMap = new Map();

  for (const room of roomRows) {
    if (!roomNumbersMap.has(room.examScheduleId)) {
      roomNumbersMap.set(room.examScheduleId, []);
      roomCapacityMap.set(room.examScheduleId, 0);
    }

    roomNumbersMap.get(room.examScheduleId).push(room.classRoom?.roomNumber);
    roomCapacityMap.set(room.examScheduleId, roomCapacityMap.get(room.examScheduleId) + Number(room.capacity || 0));
  }

  const studentCountMap = new Map();
  const scheduleMap = new Map();

  for (const schedule of schedules) {
    const item = schedule.get({ plain: true });

    const subjectId = item.subjectSchedule?.subjectId || item.subjectId;

    if (subjectId) {
      const cacheKey = `${subjectId}_${item.sessionId || ""}`;
      if (!studentCountMap.has(cacheKey)) {
        const count = await countStudentsForSubject(subjectId, item.sessionId, {
          transaction: options.transaction,
        });
        studentCountMap.set(cacheKey, count);
      }

      item.studentCount = studentCountMap.get(cacheKey) || 0;
    } else {
      item.studentCount = 0;
    }

    item.courseName = item.subjectSchedule?.course?.courseName || null;
    item.termType = item.subjectSchedule?.course?.termType || null;

    item.roomNumbers = roomNumbersMap.get(item.examScheduleId) || [];
    item.roomCapacity = roomCapacityMap.get(item.examScheduleId) || 0;

    const hasAssignedRoom = item.roomCapacity > 0;
    item.noRoom = !hasAssignedRoom;
    item.needsRoom = hasAssignedRoom && item.roomCapacity < item.studentCount;
    item.overCapacity = hasAssignedRoom && item.roomCapacity > item.studentCount;
    item.confirmed = hasAssignedRoom && item.roomCapacity === item.studentCount;

    if (!scheduleMap.has(item.examinationSessionSlotId)) {
      scheduleMap.set(item.examinationSessionSlotId, []);
    }

    scheduleMap.get(item.examinationSessionSlotId).push(item);
  }

  return slots.map((slot) => ({
    ...slot,
    schedules: scheduleMap.get(slot.examinationSessionSlotId) || [],
  }));
}

export async function getExaminationSessionSlotById(examinationSessionSlotId, options = {}) {
  return await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionSlotId: Number(examinationSessionSlotId) },
    transaction: options.transaction,
  });
}

export async function updateExaminationSessionSlot(examinationSessionSlotId, updateData, options = {}) {
  const slot = await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionSlotId: Number(examinationSessionSlotId) },
    transaction: options.transaction,
  });

  if (!slot) {
    const error = new Error("Examination session slot not found");
    error.statusCode = 404;
    throw error;
  }

  return await slot.update(updateData, { transaction: options.transaction });
}

export async function deleteExaminationSessionSlot(examinationSessionSlotId, options = {}) {
  const slot = await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionSlotId: Number(examinationSessionSlotId) },
    transaction: options.transaction,
  });

  if (!slot) {
    const error = new Error("Examination session slot not found");
    error.statusCode = 404;
    throw error;
  }

  return await slot.destroy({ transaction: options.transaction });
}
