import * as model from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";

export async function getRoomCentricMetrics(examScheduleId, classRoomSectionId) {
  if (!classRoomSectionId) return null;

  // 1. Get main exam schedule details
  const examSchedule = await model.examScheduleModel.findOne({
    where: { examScheduleId }
  });
  if (!examSchedule) return null;

  // 2. Find sibling capacities in the same room on the same date/slot
  const siblingCapacities = await model.examScheduleRoomCapacityModel.findAll({
    where: { classRoomSectionId: Number(classRoomSectionId) },
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        where: {
          examDate: examSchedule.examDate,
          examinationSessionSlotId: examSchedule.examinationSessionSlotId
        },
        required: true
      }
    ]
  });

  const siblingCapacityIds = siblingCapacities.map(rc => rc.examScheduleRoomCapacityId);

  // 3. Get student counts exam-wise for all sibling capacities
  const seatCounts = siblingCapacityIds.length ? await model.studentExamSeatModel.findAll({
    where: {
      examScheduleRoomCapacityId: { [Op.in]: siblingCapacityIds }
    },
    attributes: [
      "examScheduleRoomCapacityId",
      [sequelize.fn("COUNT", sequelize.col("student_id")), "studentCount"]
    ],
    group: ["examScheduleRoomCapacityId"],
    raw: true
  }) : [];

  const seatCountMap = new Map(
    seatCounts.map(r => [Number(r.examScheduleRoomCapacityId), parseInt(r.studentCount, 10) || 0])
  );

  let totalStudentsAll = 0;
  const totalStudentsExamWise = siblingCapacities.map(rc => {
    const count = seatCountMap.get(Number(rc.examScheduleRoomCapacityId)) || 0;
    totalStudentsAll += count;
    return {
      examScheduleId: rc.examScheduleId,
      studentCount: count
    };
  });

  // 4. Main schedule total student count across all its rooms
  const mainScheduleCapacities = await model.examScheduleRoomCapacityModel.findAll({
    where: { examScheduleId: Number(examScheduleId) }
  });
  const mainScheduleCapacityIds = mainScheduleCapacities.map(rc => rc.examScheduleRoomCapacityId);

  const mainScheduleSeatCounts = mainScheduleCapacityIds.length ? await model.studentExamSeatModel.findAll({
    where: {
      examScheduleRoomCapacityId: { [Op.in]: mainScheduleCapacityIds }
    },
    attributes: [
      "examScheduleRoomCapacityId",
      [sequelize.fn("COUNT", sequelize.col("student_id")), "studentCount"]
    ],
    group: ["examScheduleRoomCapacityId"],
    raw: true
  }) : [];

  const mainSeatCountMap = new Map(
    mainScheduleSeatCounts.map(r => [Number(r.examScheduleRoomCapacityId), parseInt(r.studentCount, 10) || 0])
  );

  let totalStudentsInSubject = 0;
  mainScheduleCapacities.forEach(rc => {
    totalStudentsInSubject += mainSeatCountMap.get(Number(rc.examScheduleRoomCapacityId)) || 0;
  });

  // 5. Main schedule student count in this specific room
  const mainCapacityInRoom = mainScheduleCapacities.find(rc => rc.classRoomSectionId === Number(classRoomSectionId));
  const numberOfStudentInRoom = mainCapacityInRoom ? (mainSeatCountMap.get(Number(mainCapacityInRoom.examScheduleRoomCapacityId)) || 0) : 0;

  // 6. Number of invigilators in the room
  const invigilatorsCount = await model.examInvigilatorAssignmentModel.count({
    where: {
      classRoomSectionId: Number(classRoomSectionId),
      examDate: examSchedule.examDate,
      examinationSessionSlotId: examSchedule.examinationSessionSlotId
    }
  });

  return {
    classRoomSectionId: Number(classRoomSectionId),
    numberOfExamsInRoom: siblingCapacities.length,
    numberOfStudentInRoom,
    totalStudentsInSubject,
    numberOfInvigilatorsInRoom: invigilatorsCount,
    totalStudentsAll,
    totalStudentsExamWise
  };
}
