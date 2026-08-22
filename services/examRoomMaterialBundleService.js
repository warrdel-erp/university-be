import * as repo from "../repository/examRoomMaterialBundleRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as model from "../models/index.js";
import { getTenantStore } from "../utility/requestContext.js";

// Utility to generate bundle code
function generateBundleCode(seqId) {
  return `B-${String(seqId).padStart(4, "0")}`;
}

export async function getBundleList(filters, pagination) {
  const { limit = 10, page = 1 } = pagination;

  // 1. Fetch paginated capacities with joins (including seats and invigilators)
  const result = await repo.getBundleList(filters, { limit, page });

  // Fetch seat counts separately to prevent Sequelize join duplication bugs
  const capacityIds = result.rows.map((rc) => rc.examScheduleRoomCapacityId);
  const seatCounts = capacityIds.length
    ? await repo.getSeatCounts(capacityIds)
    : [];
  const seatCountsMap = new Map(
    seatCounts.map((sc) => [
      sc.examScheduleRoomCapacityId,
      Number(sc.studentCount || 0),
    ]),
  );

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
        examCapacity: plain.classRoom?.examCapacity,
        roomCapacity: plain.classRoom?.capacity,
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
        bundle: null,
      });
    }

    const bundle =
      plain.classRoom?.materialBundles &&
      plain.classRoom.materialBundles.length > 0
        ? plain.classRoom.materialBundles[0]
        : null;

    if (bundle && !roomMap.get(key).bundle) {
      const quantities = {
        ANSWER_SHEET: 0,
        EXTRA_SHEET: 0,
        GRAPH_SHEET: 0,
        ROUGH_SHEET: 0,
        ATTENDANCE_SHEET: 0,
        ROOM_KIT: 0,
      };

      if (bundle.items) {
        bundle.items.forEach((item) => {
          quantities[item.itemType] = item.plannedQuantity || 0;
        });
      }

      roomMap.get(key).bundle = {
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
      };
    }

    const studentCount =
      seatCountsMap.get(plain.examScheduleRoomCapacityId) || 0;

    roomMap.get(key).exams.push({
      examScheduleRoomCapacityId: plain.examScheduleRoomCapacityId,
      examScheduleId: plain.examScheduleId,
      subjectId: schedule.subjectSchedule?.subjectId,
      subjectName: schedule.subjectSchedule?.subjectName,
      subjectCode: schedule.subjectSchedule?.subjectCode,
      courseId: schedule.subjectSchedule?.courseId,
      sessionId: schedule.sessionId,
      term: schedule.term,
      capacity: studentCount,
      studentCount,
      isRoomAllocationDone: studentCount > 0,
    });
  }

  // 3. Post-process to align student counts for same class in the same room/slot
  for (const roomObj of roomMap.values()) {
    const classMaxCounts = {};
    for (const exam of roomObj.exams) {
      const classKey = `${exam.courseId}_${exam.sessionId}_${exam.term}`;
      if (exam.studentCount > 0) {
        classMaxCounts[classKey] = Math.max(
          classMaxCounts[classKey] || 0,
          exam.studentCount,
        );
      }
    }
    for (const exam of roomObj.exams) {
      const classKey = `${exam.courseId}_${exam.sessionId}_${exam.term}`;
      const maxCount = classMaxCounts[classKey] || 0;
      if (exam.studentCount === 0 && maxCount > 0) {
        exam.studentCount = maxCount;
        exam.capacity = maxCount;
        exam.isRoomAllocationDone = true;
      }
    }
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

  let TotalMaterial = 0;
  let issuedmaterial = 0;
  let materialTypes = 0;

  if (bundleDetails) {
    materialTypes = bundleDetails.items?.length || 0;
    bundleDetails.items?.forEach((item) => {
      TotalMaterial += item.plannedQuantity || 0;
      issuedmaterial += item.issuedQuantity || 0;
    });
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
    bundleCode: bundleDetails ? bundleDetails.bundleCode : null,
    BundleCode: bundleDetails ? bundleDetails.bundleCode : null,
    TotalMaterial,
    totalMaterial: TotalMaterial,
    issuedmaterial,
    issuedMaterial: issuedmaterial,
    materialTypes,
    exams,
    bundle: bundleDetails,
  };
}

export async function createBundle(payload, user) {
  const {
    examDate,
    examinationSessionSlotId,
    classRoomSectionId,
    items,
    issuedTo,
  } = payload;

  return await sequelize.transaction(async (transaction) => {
    // 1. Search for existing bundle by derived fields and tenant scope
    const existing = await repo.findBundleByMapping(
      examDate,
      examinationSessionSlotId,
      classRoomSectionId,
      transaction,
    );

    if (existing) {
      // Validate and update issuedTo if provided
      if (issuedTo) {
        const invigilators = await repo.getActiveInvigilatorsForRoomSlot(
          classRoomSectionId,
          examDate,
          examinationSessionSlotId,
          transaction,
        );
        const invigilatorUserIds = invigilators.map((ia) => Number(ia.userId));
        if (!invigilatorUserIds.includes(Number(issuedTo))) {
          const error = new Error(
            "The recipient must be an assigned invigilator for this room slot",
          );
          error.statusCode = 400;
          throw error;
        }

        existing.status = "ISSUED";
        existing.issuedTo = issuedTo;
        existing.issuedBy = user.userId;
        existing.issuedAt = new Date();
        await existing.save({ transaction });
      }

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

    if (issuedTo) {
      // Validate that issuedTo is one of the invigilators
      const invigilators = await repo.getActiveInvigilatorsForRoomSlot(
        classRoomSectionId,
        examDate,
        examinationSessionSlotId,
        transaction,
      );
      const invigilatorUserIds = invigilators.map((ia) => Number(ia.userId));
      if (!invigilatorUserIds.includes(Number(issuedTo))) {
        const error = new Error(
          "The recipient must be an assigned invigilator for this room slot",
        );
        error.statusCode = 400;
        throw error;
      }
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

    const tenantStore = getTenantStore();
    const universityId = tenantStore.universityId || user.universityId;
    const instituteId = tenantStore.instituteId || user.defaultInstituteId;
    const academicYearId = tenantStore.academicYearId || user.defaultAcademicYearId;

    const bundleData = {
      examDate,
      examinationSessionSlotId,
      classRoomSectionId,
      bundleCode,
      status: issuedTo ? "ISSUED" : "PREPARING",
      issuedTo: issuedTo || null,
      issuedBy: issuedTo ? user.userId : null,
      issuedAt: issuedTo ? new Date() : null,
      universityId,
      instituteId,
      academicYearId,
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
        if (!issuedTo) {
          const error = new Error("issuedTo is required to issue the bundle");
          error.statusCode = 400;
          throw error;
        }

        // Fetch assigned invigilators for this room, date, and slot
        const invigilators = await repo.getActiveInvigilatorsForRoomSlot(
          bundle.classRoomSectionId,
          bundle.examDate,
          bundle.examinationSessionSlotId,
          transaction,
        );

        const invigilatorUserIds = invigilators.map((ia) => Number(ia.userId));
        if (!invigilatorUserIds.includes(Number(issuedTo))) {
          const error = new Error(
            "The recipient must be an assigned invigilator for this room slot",
          );
          error.statusCode = 400;
          throw error;
        }

        bundleUpdateFields.issuedTo = issuedTo;
        bundleUpdateFields.issuedBy = user.userId;
        bundleUpdateFields.issuedAt = new Date();
      } else if (status === "READY") {
        // Collect all item types that will be present in the bundle after update
        const existingItems = await repo.getBundleItemsByBundleId(bundleId);
        const itemTypes = new Set(existingItems.map((i) => i.itemType));
        
        // If items are provided in payload, update the set of types with the new payload items
        if (items && items.length > 0) {
          items.forEach((item) => itemTypes.add(item.itemType));
        }

        const requiredTypes = ["QUESTION_PAPER", "ANSWER_SHEET", "ATTENDANCE_SHEET"];
        const missingTypes = requiredTypes.filter((type) => !itemTypes.has(type));

        if (missingTypes.length > 0) {
          const error = new Error(
            `Cannot set bundle to READY status. Missing required material items: ${missingTypes.join(", ")}`
          );
          error.statusCode = 400;
          throw error;
        }
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
      const examinationSessionSlotId =
        b.examScheduleRoomCapacity?.examSchedule?.examinationSessionSlotId;
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

    const classRoomSectionId =
      bundle.examScheduleRoomCapacity?.classRoomSectionId;
    const examDate = bundle.examScheduleRoomCapacity?.examSchedule?.examDate;
    const examinationSessionSlotId =
      bundle.examScheduleRoomCapacity?.examSchedule?.examinationSessionSlotId;
    return getBundleByRoomDetails(
      classRoomSectionId,
      examDate,
      examinationSessionSlotId,
    );
  });
}

export async function getReadyBundleList(filters, pagination) {
  const result = await repo.getReadyBundleList(filters, pagination);

  const formattedRows = result.rows.map((bundleRecord) => {
    const bundle = bundleRecord.get({ plain: true });
    
    let TotalMaterial = 0;
    let issuedmaterial = 0;
    let materialTypes = bundle.items?.length || 0;

    if (bundle.items) {
      bundle.items.forEach((item) => {
        TotalMaterial += item.plannedQuantity || 0;
        issuedmaterial += item.issuedQuantity || 0;
        const planned = item.plannedQuantity || 0;
        const issued = item.issuedQuantity || 0;
        item.pendingQuantity = Math.max(planned - issued, 0);
      });
    }

    return {
      examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
      bundleCode: bundle.bundleCode,
      status: bundle.status,
      examDate: bundle.examDate,
      examinationSessionSlotId: bundle.examinationSessionSlotId,
      classRoomSectionId: bundle.classRoomSectionId,
      roomNumber: bundle.classRoom?.roomNumber || null,
      totalMaterial: TotalMaterial,
      issuedMaterial: issuedmaterial,
      materialTypes,
      items: bundle.items || [],
      issuedToUser: bundle.recipientUser || null,
      issuedByUser: bundle.issuerUser || null,
      issuedAt: bundle.issuedAt,
      slot: bundle.examinationSessionSlot || null,
    };
  });

  return {
    rows: formattedRows,
    count: result.count,
  };
}

// end of file
