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
  { examinationSessionId, date, filterCombinations, filterStatus, selections },
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

  const scheduleInclude = [
    {
      model: model.subjectModel,
      as: "subjectSchedule",
      required: true,
      attributes: [
        "subjectId",
        "subjectName",
        "subjectCode",
        "courseId",
      ],
      include: [
        {
          model: model.courseModel,
          as: "courseInfo",
          attributes: ["courseName", "termType"],
        }
      ]
    },
  ];

  if (filterCombinations.length > 0) {
    // Session is at schedule level, course and term are at subject level
    // Group target conditions using Sequelize Op.or
    const orSchedules = filterCombinations.map(comb => ({
      sessionId: comb.sessionId,
      "$subjectSchedule.course_id$": comb.courseId,
      "$subjectSchedule.term$": { [Op.in]: comb.terms }
    }));
    scheduleWhere[Op.or] = orSchedules;
  }

  const schedules = await scoped(model.examScheduleModel).findAll({
    where: scheduleWhere,
    include: scheduleInclude,
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

    item.courseName = item.subjectSchedule?.courseInfo?.courseName || null;
    item.termType = item.subjectSchedule?.courseInfo?.termType || null;

    item.roomNumbers = roomNumbersMap.get(item.examScheduleId) || [];
    item.roomCapacity = roomCapacityMap.get(item.examScheduleId) || 0;

    const roomCapacity = item.roomCapacity;
    const studentCount = item.studentCount;
    const hasAssignedRoom = roomCapacity > 0;

    item.needsScheduling = false;
    item.roomPending = !hasAssignedRoom || roomCapacity < studentCount;
    item.needsRoom = false;
    item.ready = roomCapacity >= studentCount;
    item.published = item.published || false;

    if (!scheduleMap.has(item.examinationSessionSlotId)) {
      scheduleMap.set(item.examinationSessionSlotId, []);
    }

    scheduleMap.get(item.examinationSessionSlotId).push(item);
  }

  // Retrieve unscheduled subjects (needsScheduling) for this session matching the selections criteria
  let unscheduledSubjectsMapped = [];
  if (filterStatus === "needsScheduling" && filterCombinations.length > 0) {
    const examinationSessionServices = await import("../services/examinationSessionServices.js");
    const subjectsList = await examinationSessionServices.getMappedSubjectsBySessionAndTerm({
      examinationSessionId,
      selections,
      filterStatus: "needsScheduling"
    }, options);

    unscheduledSubjectsMapped = subjectsList.map(sub => ({
      examScheduleId: null,
      subjectId: sub.subjectId,
      term: sub.term,
      academicYearId: sub.academicYearId || null,
      sessionId: sub.sessionId,
      examDate: null,
      examTime: null,
      type: null,
      duration: null,
      examinationSessionSlotId: null,
      studentCount: sub.studentCount || 0,
      courseName: sub.courseName || null,
      termType: sub.termType || null,
      roomNumbers: [],
      roomCapacity: 0,
      needsScheduling: true,
      roomPending: false,
      needsRoom: false,
      ready: false,
      published: false,
    }));
  }

  return slots.map((slot) => {
    let list = scheduleMap.get(slot.examinationSessionSlotId) || [];
    if (filterStatus && filterStatus !== "all" && filterStatus !== "needsScheduling") {
      list = list.filter((sched) => sched[filterStatus] === true);
    }
    if (filterStatus === "needsScheduling") {
      list = [];
    }
    const combinedSchedules = [...list, ...unscheduledSubjectsMapped];

    return {
      ...slot,
      schedules: combinedSchedules,
    };
  });
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
