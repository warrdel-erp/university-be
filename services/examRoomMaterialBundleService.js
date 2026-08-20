import * as repo from "../repository/examRoomMaterialBundleRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";

// Utility to generate bundle code
function generateBundleCode(seqId) {
  return `B-${String(seqId).padStart(4, "0")}`;
}

export async function getBundleList(filters, pagination) {
  const { limit = 10, page = 1 } = pagination;

  // 1. Fetch paginated capacities with joins (including seats and invigilators)
  const result = await repo.getBundleList(filters, { limit, page });

  // 2. Perform in-memory grouping on the paginated rows
  const roomMap = new Map();

  for (const rc of result.rows) {
    const plain = rc.get({ plain: true });
    const roomId = plain.classRoomSectionId;
    const schedule = plain.examSchedule;
    const slot = schedule?.examinationSessionSlot;

    // Grouping key: classRoomSectionId + examDate + examinationSessionSlotId
    const key = `${roomId}_${schedule.examDate}_${schedule.examinationSessionSlotId}`;

    if (!roomMap.has(key)) {
      // Extract invigilators from classroom join
      const invigilators = (plain.classRoom?.examInvigilatorAssignments || [])
        .map((ia) => ({
          userId: ia.user?.userId,
          userName: ia.user?.userName,
        }))
        .filter((u) => u.userId);

      roomMap.set(key, {
        classRoomSectionId: roomId,
        roomNumber: plain.classRoom?.roomNumber,
        examDate: schedule.examDate,
        slot: slot
          ? {
              examinationSessionSlotId: slot.examinationSessionSlotId,
              slotNumber: slot.slotNumber,
              startTime: slot.startTime,
              endTime: slot.endTime,
            }
          : null,
        invigilators,
        exams: [],
      });
    }

    const bundle =
      plain.classRoom?.materialBundles &&
      plain.classRoom.materialBundles.length > 0
        ? plain.classRoom.materialBundles[0]
        : null;

    const quantities = {
      ANSWER_SHEET: 0,
      EXTRA_SHEET: 0,
      GRAPH_SHEET: 0,
      ROUGH_SHEET: 0,
      ATTENDANCE_SHEET: 0,
      ROOM_KIT: 0,
    };

    if (bundle && bundle.items) {
      bundle.items.forEach((item) => {
        quantities[item.itemType] = item.plannedQuantity || 0;
      });
    }

    const studentCount = plain.seats?.length || 0;

    roomMap.get(key).exams.push({
      examScheduleRoomCapacityId: plain.examScheduleRoomCapacityId,
      examScheduleId: plain.examScheduleId,
      subjectId: schedule.subjectSchedule?.subjectId,
      subjectName: schedule.subjectSchedule?.subjectName,
      subjectCode: schedule.subjectSchedule?.subjectCode,
      courseId: schedule.subjectSchedule?.courseId,
      sessionId: schedule.sessionId,
      term: schedule.term,
      capacity: plain.capacity,
      studentCount,
      isRoomAllocationDone: studentCount > 0,
      bundle: bundle
        ? {
            examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
            bundleCode: bundle.bundleCode,
            status: bundle.status,
            materialQuantities: quantities,
            issuedTo: bundle.recipientUser
              ? {
                  userId: bundle.recipientUser.userId,
                  userName: bundle.recipientUser.userName,
                }
              : null,
            issuedBy: bundle.issuerUser
              ? {
                  userId: bundle.issuerUser.userId,
                  userName: bundle.issuerUser.userName,
                }
              : null,
            issuedAt: bundle.issuedAt,
          }
        : null,
    });
  }

  return {
    rows: Array.from(roomMap.values()),
    count: result.count,
  };
}

export async function getBundleByRoomDetails(
  classRoomSectionId,
  examDate,
  examinationSessionSlotId,
) {
  // 1. Find all room capacity records sharing this room, date, and slot
  const sharingCapacities = await model.examScheduleRoomCapacityModel.findAll({
    where: { classRoomSectionId },
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        where: { examDate, examinationSessionSlotId },
        required: true,
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
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
          },
        ],
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber"],
      },
      {
        model: model.studentExamSeatModel,
        as: "seats",
        attributes: ["studentId"],
      },
    ],
  });

  if (sharingCapacities.length === 0) {
    const error = new Error(
      "No exam schedule found for this room, date, and slot",
    );
    error.statusCode = 404;
    throw error;
  }

  const firstRc = sharingCapacities[0].get({ plain: true });

  let totalStudentCount = 0;
  const exams = sharingCapacities.map((rc) => {
    const plainRc = rc.get({ plain: true });
    const count = plainRc.seats?.length || 0;
    totalStudentCount += count;
    return {
      examScheduleRoomCapacityId: plainRc.examScheduleRoomCapacityId,
      examScheduleId: plainRc.examScheduleId,
      subjectId: plainRc.examSchedule?.subjectSchedule?.subjectId,
      subjectName: plainRc.examSchedule?.subjectSchedule?.subjectName,
      subjectCode: plainRc.examSchedule?.subjectSchedule?.subjectCode,
      courseId: plainRc.examSchedule?.subjectSchedule?.courseId,
      sessionId: plainRc.examSchedule?.sessionId,
      term: plainRc.examSchedule?.term,
      capacity: plainRc.capacity,
      studentCount: count,
      isRoomAllocationDone: count > 0,
    };
  });

  // 2. Find if bundle exists
  const bundle = await repo.findBundleByMapping(
    examDate,
    examinationSessionSlotId,
    classRoomSectionId,
  );
  let bundleDetails = null;

  if (bundle) {
    const fullBundle = await repo.getBundleById(
      bundle.examRoomMaterialBundleId,
    );
    if (fullBundle) {
      const plainBundle = fullBundle.get({ plain: true });
      if (plainBundle.items) {
        plainBundle.items.forEach((item) => {
          const planned = item.plannedQuantity || 0;
          const issued = item.issuedQuantity || 0;
          item.pendingQuantity = Math.max(planned - issued, 0);
        });
      }
      bundleDetails = {
        examRoomMaterialBundleId: plainBundle.examRoomMaterialBundleId,
        bundleCode: plainBundle.bundleCode,
        status: plainBundle.status,
        items: plainBundle.items || [],
        issuedToUser: plainBundle.recipientUser,
        issuedByUser: plainBundle.issuerUser,
        issuedAt: plainBundle.issuedAt,
        receivedByUser: plainBundle.receiverUser,
        receivedAt: plainBundle.receivedAt,
        verifiedByUser: plainBundle.verifierUser,
        verifiedAt: plainBundle.verifiedAt,
        remarks: plainBundle.remarks,
      };
    }
  }

  return {
    classRoomSectionId,
    roomNumber: firstRc.classRoom?.roomNumber,
    examDate,
    examinationSessionSlotId,
    slot: firstRc.examSchedule?.examinationSessionSlot
      ? {
          examinationSessionSlotId:
            firstRc.examSchedule.examinationSessionSlot
              .examinationSessionSlotId,
          slotNumber: firstRc.examSchedule.examinationSessionSlot.slotNumber,
          startTime: firstRc.examSchedule.examinationSessionSlot.startTime,
          endTime: firstRc.examSchedule.examinationSessionSlot.endTime,
        }
      : null,
    studentCount: totalStudentCount,
    isRoomAllocationDone: totalStudentCount > 0,
    isBundleCreated: bundleDetails !== null,
    exams,
    bundle: bundleDetails,
  };
}

export async function createBundle(payload, user) {
  const { examDate, examinationSessionSlotId, classRoomSectionId, items } =
    payload;

  return await sequelize.transaction(async (transaction) => {
    // 1. Search for existing bundle by derived fields and tenant scope
    const existing = await repo.findBundleByMapping(
      examDate,
      examinationSessionSlotId,
      classRoomSectionId,
      transaction,
    );

    if (existing) {
      // 2. Reuse existing bundle and upsert items under it
      const itemsData = items.map((item) => ({
        examRoomMaterialBundleId: existing.examRoomMaterialBundleId,
        itemType: item.itemType,
        plannedQuantity: item.plannedQuantity || 0,
        issuedQuantity: 0,
        usedQuantity: 0,
        unusedQuantity: 0,
        returnedQuantity: 0,
        damagedQuantity: 0,
        remarks: item.remarks || null,
        createdBy: user.userId,
        updatedBy: user.userId,
      }));

      await repo.updateBundleItems(
        existing.examRoomMaterialBundleId,
        itemsData,
        transaction,
      );
      return getBundleByRoomDetails(
        classRoomSectionId,
        examDate,
        examinationSessionSlotId,
      );
    }

    // Check if there is an exam schedule capacity for this combo to make sure it's valid
    const capacity = await model.examScheduleRoomCapacityModel.findOne({
      where: { classRoomSectionId },
      include: [
        {
          model: model.examScheduleModel,
          as: "examSchedule",
          where: { examDate, examinationSessionSlotId },
          required: true,
        },
      ],
      transaction,
    });
    if (!capacity) {
      const error = new Error(
        "No exam schedule capacity found for the given date, slot, and room",
      );
      error.statusCode = 404;
      throw error;
    }

    // Generate Bundle Code
    const maxIdResult = await model.examRoomMaterialBundleModel.findOne({
      attributes: [
        [
          sequelize.fn("MAX", sequelize.col("exam_room_material_bundle_id")),
          "maxId",
        ],
      ],
      raw: true,
      transaction,
      paranoid: false,
    });
    const maxId = parseInt(maxIdResult?.maxId, 10) || 0;
    const bundleCode = generateBundleCode(maxId + 1);

    const bundleData = {
      examDate,
      examinationSessionSlotId,
      classRoomSectionId,
      bundleCode,
      status: "PREPARING",
      universityId: user.universityId,
      instituteId: user.defaultInstituteId,
      academicYearId: user.defaultAcademicYearId,
      createdBy: user.userId,
      updatedBy: user.userId,
    };

    const itemsData = items.map((item) => ({
      itemType: item.itemType,
      plannedQuantity: item.plannedQuantity || 0,
      issuedQuantity: 0,
      usedQuantity: 0,
      unusedQuantity: 0,
      returnedQuantity: 0,
      damagedQuantity: 0,
      remarks: item.remarks || null,
    }));

    await repo.createBundle(bundleData, itemsData, transaction);
    return getBundleByRoomDetails(
      classRoomSectionId,
      examDate,
      examinationSessionSlotId,
    );
  });
}

export async function updateBundleItems(bundleId, payload, user) {
  const { status, remarks, issuedTo, items } = payload;

  return await sequelize.transaction(async (transaction) => {
    const bundle = await repo.getBundleById(bundleId);
    if (!bundle) {
      const error = new Error("Bundle not found");
      error.statusCode = 404;
      throw error;
    }

    if (bundle.status === "CLOSED") {
      const error = new Error("Cannot update a closed bundle");
      error.statusCode = 400;
      throw error;
    }

    // 1. Update bundle properties if provided
    const bundleUpdateFields = {};
    if (status) {
      bundleUpdateFields.status = status;
      if (status === "ISSUED") {
        bundleUpdateFields.issuedTo = issuedTo || null;
        bundleUpdateFields.issuedBy = user.userId;
        bundleUpdateFields.issuedAt = new Date();
      } else if (status === "RECEIVED") {
        bundleUpdateFields.receivedBy = user.userId;
        bundleUpdateFields.receivedAt = new Date();
      } else if (status === "VERIFIED") {
        bundleUpdateFields.verifiedBy = user.userId;
        bundleUpdateFields.verifiedAt = new Date();
      }
    }
    if (remarks !== undefined) {
      bundleUpdateFields.remarks = remarks;
    }
    if (Object.keys(bundleUpdateFields).length > 0) {
      bundleUpdateFields.updatedBy = user.userId;
      await bundle.update(bundleUpdateFields, { transaction });
    }

    // 2. Update child items if provided
    if (items && items.length > 0) {
      // Check for duplicate itemTypes in payload
      const itemTypes = items.map((i) => i.itemType);
      if (new Set(itemTypes).size !== itemTypes.length) {
        const error = new Error("Duplicate material types are not allowed");
        error.statusCode = 400;
        throw error;
      }

      const existingItems = await repo.getBundleItemsByBundleId(bundleId);
      const existingItemMap = new Map();
      existingItems.forEach((i) =>
        existingItemMap.set(i.itemType, i.examRoomMaterialItemId),
      );

      const itemsToUpsert = items.map((item) => {
        const data = {
          examRoomMaterialBundleId: bundleId,
          itemType: item.itemType,
          plannedQuantity: item.plannedQuantity,
          issuedQuantity: item.issuedQuantity,
          usedQuantity: item.usedQuantity,
          unusedQuantity: item.unusedQuantity,
          returnedQuantity: item.returnedQuantity,
          damagedQuantity: item.damagedQuantity,
          remarks: item.remarks,
          updatedBy: user.userId,
          updatedAt: new Date(),
        };

        // If it exists, provide the ID for bulkCreate updateOnDuplicate to work properly
        if (existingItemMap.has(item.itemType)) {
          data.examRoomMaterialItemId = existingItemMap.get(item.itemType);
        }
        data.createdBy = user.userId;

        return data;
      });

      await repo.updateBundleItems(bundleId, itemsToUpsert, transaction);
    }

    return getBundleByRoomDetails(
      bundle.classRoomSectionId,
      bundle.examDate,
      bundle.examinationSessionSlotId,
    );
  });
}

export async function getBundleSummary(examinationSessionId) {
  const scheduleWhere = { examinationSessionId };

  // 1. Fetch classroom capacities matching our filters using repository
  const capacities = await repo.getSummaryCapacities(scheduleWhere);

  const uniqueRooms = new Map();
  capacities.forEach((c) => {
    const key = `${c.classRoomSectionId}_${c["examSchedule.examDate"]}_${c["examSchedule.examinationSessionSlotId"]}`;
    uniqueRooms.set(key, {
      classRoomSectionId: c.classRoomSectionId,
      examDate: c["examSchedule.examDate"],
      examinationSessionSlotId: c["examSchedule.examinationSessionSlotId"],
    });
  });

  let roomCount = uniqueRooms.size;
  let pendingCount = 0;
  let issuedCount = 0;
  let closedCount = 0;

  if (roomCount > 0) {
    const roomList = Array.from(uniqueRooms.values());
    const classRoomSectionIds = roomList.map((r) => r.classRoomSectionId);
    const examDates = roomList.map((r) => r.examDate);
    const slotIds = roomList.map((r) => r.examinationSessionSlotId);

    // 2. Fetch all bundles using repository
    const bundles = await repo.getSummaryBundles(
      classRoomSectionIds,
      examDates,
      slotIds,
    );

    const bundleMap = new Map();
    bundles.forEach((b) => {
      const classRoomSectionId = b.examScheduleRoomCapacity?.classRoomSectionId;
      const examDate = b.examScheduleRoomCapacity?.examSchedule?.examDate;
      const examinationSessionSlotId = b.examScheduleRoomCapacity?.examSchedule?.examinationSessionSlotId;
      const key = `${classRoomSectionId}_${examDate}_${examinationSessionSlotId}`;
      bundleMap.set(key, b.status);
    });

    uniqueRooms.forEach((room, key) => {
      const status = bundleMap.get(key);
      if (!status || status === "PREPARING" || status === "READY") {
        pendingCount++;
      } else if (
        status === "ISSUED" ||
        status === "RECEIVED" ||
        status === "VERIFIED"
      ) {
        issuedCount++;
      } else if (status === "CLOSED") {
        closedCount++;
      }
    });
  }

  return {
    roomCount,
    bundleIssuePending: pendingCount,
    bundleIssued: issuedCount,
    bundleClosed: closedCount,
  };
}

export async function updateBundleStatus(bundleId, status, user) {
  return await sequelize.transaction(async (transaction) => {
    const bundle = await repo.getBundleById(bundleId);
    if (!bundle) {
      const error = new Error("Bundle not found");
      error.statusCode = 404;
      throw error;
    }

    if (bundle.status === "CLOSED") {
      const error = new Error("Cannot update status of a closed bundle");
      error.statusCode = 400;
      throw error;
    }

    const bundleUpdateFields = { status };
    if (status === "RECEIVED") {
      bundleUpdateFields.receivedBy = user.userId;
      bundleUpdateFields.receivedAt = new Date();
    } else if (status === "VERIFIED") {
      bundleUpdateFields.verifiedBy = user.userId;
      bundleUpdateFields.verifiedAt = new Date();
    } else {
      const error = new Error("Invalid status update");
      error.statusCode = 400;
      throw error;
    }

    bundleUpdateFields.updatedBy = user.userId;
    await bundle.update(bundleUpdateFields, { transaction });

    const classRoomSectionId = bundle.examScheduleRoomCapacity?.classRoomSectionId;
    const examDate = bundle.examScheduleRoomCapacity?.examSchedule?.examDate;
    const examinationSessionSlotId = bundle.examScheduleRoomCapacity?.examSchedule?.examinationSessionSlotId;
    return getBundleByRoomDetails(classRoomSectionId, examDate, examinationSessionSlotId);
  });
}

// end of file
