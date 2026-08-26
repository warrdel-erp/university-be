import * as repo from "../repository/examRoomMaterialBundleRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { getTenantStore } from "../utility/requestContext.js";

function generateBundleCode(roomNumber, seqId) {
  const cleanRoom = String(roomNumber || "000")
    .trim()
    .replace(/\s+/g, "");
  return `B-${cleanRoom}-${String(seqId).padStart(2, "0")}`;
}

function roomOccurrenceKey(classRoomSectionId, examDate, examinationSessionSlotId) {
  return `${classRoomSectionId}_${examDate}_${examinationSessionSlotId}`;
}

export async function getBundleList(filters, pagination) {
  const { limit = 10, page = 1 } = pagination;

  const result = await repo.getBundleList(filters, { limit, page });

  const capacityIds = [];
  for (const rc of result.rows) {
    capacityIds.push(rc.examScheduleRoomCapacityId);
  }
  const seatCounts = capacityIds.length
    ? await repo.getSeatCounts(capacityIds)
    : [];
  const seatCountsMap = new Map();
  for (const sc of seatCounts) {
    seatCountsMap.set(
      sc.examScheduleRoomCapacityId,
      Number(sc.studentCount || 0),
    );
  }

  const roomMap = new Map();

  for (const rc of result.rows) {
    const plain = rc.get({ plain: true });
    const roomId = plain.classRoomSectionId;
    const schedule = plain.examSchedule;
    const slot = schedule.examinationSessionSlot;
    const key = roomOccurrenceKey(
      roomId,
      schedule.examDate,
      schedule.examinationSessionSlotId,
    );

    if (!roomMap.has(key)) {
      const invigilators = [];
      const assignments = plain.classRoom.examInvigilatorAssignments || [];
      for (const ia of assignments) {
        if (!ia.user || !ia.user.userId) continue;
        invigilators.push({
          userId: ia.user.userId,
          userName: ia.user.userName,
        });
      }

      roomMap.set(key, {
        classRoomSectionId: roomId,
        roomNumber: plain.classRoom.roomNumber,
        examCapacity: plain.classRoom.examCapacity,
        roomCapacity: plain.classRoom.capacity,
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

    const bundles = plain.classRoom.materialBundles || [];
    const bundle = bundles.length > 0 ? bundles[0] : null;

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
        for (const item of bundle.items) {
          quantities[item.itemType] = item.plannedQuantity || 0;
        }
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
    const subject = schedule.subjectSchedule;

    roomMap.get(key).exams.push({
      examScheduleRoomCapacityId: plain.examScheduleRoomCapacityId,
      examScheduleId: plain.examScheduleId,
      subjectId: subject ? subject.subjectId : null,
      subjectName: subject ? subject.subjectName : null,
      subjectCode: subject ? subject.subjectCode : null,
      courseId: subject ? subject.courseId : null,
      sessionId: schedule.sessionId,
      term: schedule.term,
      capacity: studentCount,
      studentCount,
      isRoomAllocationDone: studentCount > 0,
    });
  }

  const rows = [];
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

    let totalStudentCount = 0;
    for (const exam of roomObj.exams) {
      const classKey = `${exam.courseId}_${exam.sessionId}_${exam.term}`;
      const maxCount = classMaxCounts[classKey] || 0;
      if (exam.studentCount === 0 && maxCount > 0) {
        exam.studentCount = maxCount;
        exam.capacity = maxCount;
        exam.isRoomAllocationDone = true;
      }
      totalStudentCount += exam.studentCount;
    }

    roomObj.studentCount = totalStudentCount;
    roomObj.invigilatorTrue = roomObj.invigilators.length > 0;

    if (!roomObj.invigilatorTrue) {
      roomObj.operationalStatus = "Invigilator Pending";
    } else if (!roomObj.bundle) {
      roomObj.operationalStatus = "Bundle Not Created";
    } else {
      roomObj.operationalStatus = `Bundle ${roomObj.bundle.status}`;
    }

    rows.push(roomObj);
  }

  return {
    rows,
    count: result.count,
  };
}

export async function getBundleByRoomDetails(
  classRoomSectionId,
  examDate,
  examinationSessionSlotId,
) {
  const sharingCapacities = await repo.findRoomCapacitiesForBundleRoom(
    classRoomSectionId,
    examDate,
    examinationSessionSlotId,
  );

  if (sharingCapacities.length === 0) {
    const error = new Error(
      "No exam schedule found for this room, date, and slot",
    );
    error.statusCode = 404;
    throw error;
  }

  const firstRc = sharingCapacities[0].get({ plain: true });

  let totalStudentCount = 0;
  const exams = [];
  for (const rc of sharingCapacities) {
    const plainRc = rc.get({ plain: true });
    const seats = plainRc.seats || [];
    const count = seats.length;
    totalStudentCount += count;
    const subject = plainRc.examSchedule.subjectSchedule;
    exams.push({
      examScheduleRoomCapacityId: plainRc.examScheduleRoomCapacityId,
      examScheduleId: plainRc.examScheduleId,
      subjectId: subject ? subject.subjectId : null,
      subjectName: subject ? subject.subjectName : null,
      subjectCode: subject ? subject.subjectCode : null,
      courseId: subject ? subject.courseId : null,
      sessionId: plainRc.examSchedule.sessionId,
      term: plainRc.examSchedule.term,
      capacity: plainRc.capacity,
      studentCount: count,
      isRoomAllocationDone: count > 0,
    });
  }

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
      const items = plainBundle.items || [];
      for (const item of items) {
        const planned = item.plannedQuantity || 0;
        const issued = item.issuedQuantity || 0;
        item.pendingQuantity = Math.max(planned - issued, 0);
      }
      bundleDetails = {
        examRoomMaterialBundleId: plainBundle.examRoomMaterialBundleId,
        bundleCode: plainBundle.bundleCode,
        status: plainBundle.status,
        items,
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
    materialTypes = bundleDetails.items.length;
    for (const item of bundleDetails.items) {
      TotalMaterial += item.plannedQuantity || 0;
      issuedmaterial += item.issuedQuantity || 0;
    }
  }

  const invigilatorsRaw = await repo.getInvigilators(
    examinationSessionSlotId,
    examDate,
    classRoomSectionId,
  );
  const invigilators = [];
  for (const inv of invigilatorsRaw) {
    invigilators.push({
      userId: inv.user ? inv.user.userId : inv.userId,
      userName: inv.user ? inv.user.userName : "",
    });
  }

  const slot = firstRc.examSchedule.examinationSessionSlot;

  return {
    classRoomSectionId,
    roomNumber: firstRc.classRoom.roomNumber,
    examDate,
    examinationSessionSlotId,
    slot: slot
      ? {
          examinationSessionSlotId: slot.examinationSessionSlotId,
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }
      : null,
    studentCount: totalStudentCount,
    isRoomAllocationDone: totalStudentCount > 0,
    isBundleCreated: bundleDetails !== null,
    bundleCode: bundleDetails ? bundleDetails.bundleCode : null,
    totalMaterial: TotalMaterial,
    issuedMaterial: issuedmaterial,
    materialTypes,
    exams,
    bundle: bundleDetails,
    invigilators,
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

  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findBundleByMapping(
      examDate,
      examinationSessionSlotId,
      classRoomSectionId,
      transaction,
    );

    if (existing) {
      if (issuedTo) {
        const invigilators = await repo.getActiveInvigilatorsForRoomSlot(
          classRoomSectionId,
          examDate,
          examinationSessionSlotId,
          transaction,
        );
        let isInvigilator = false;
        for (const ia of invigilators) {
          if (Number(ia.userId) === Number(issuedTo)) {
            isInvigilator = true;
            break;
          }
        }
        if (!isInvigilator) {
          const error = new Error(
            "The recipient must be an assigned invigilator for this room slot",
          );
          error.statusCode = 400;
          throw error;
        }

        await repo.updateBundle(
          existing.examRoomMaterialBundleId,
          {
            status: "ISSUED",
            issuedTo,
            issuedBy: user.userId,
            issuedAt: new Date(),
            updatedBy: user.userId,
          },
          { transaction },
        );
      }

      const itemsData = [];
      for (const item of items) {
        itemsData.push({
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
        });
      }

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

    const capacity = await repo.findRoomCapacityByRoomDateSlot(
      classRoomSectionId,
      examDate,
      examinationSessionSlotId,
      { transaction },
    );
    if (!capacity) {
      const error = new Error(
        "No exam schedule capacity found for the given date, slot, and room",
      );
      error.statusCode = 404;
      throw error;
    }

    if (issuedTo) {
      const invigilators = await repo.getActiveInvigilatorsForRoomSlot(
        classRoomSectionId,
        examDate,
        examinationSessionSlotId,
        transaction,
      );
      let isInvigilator = false;
      for (const ia of invigilators) {
        if (Number(ia.userId) === Number(issuedTo)) {
          isInvigilator = true;
          break;
        }
      }
      if (!isInvigilator) {
        const error = new Error(
          "The recipient must be an assigned invigilator for this room slot",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const roomNumber = capacity.classRoom
      ? capacity.classRoom.roomNumber || ""
      : "";
    const existingBundlesCount = await repo.countBundlesByRoom(
      classRoomSectionId,
      { transaction },
    );
    const bundleCode = generateBundleCode(roomNumber, existingBundlesCount + 1);

    const tenantStore = getTenantStore();
    const universityId = tenantStore.universityId || user.universityId;
    const instituteId = tenantStore.instituteId || user.defaultInstituteId;
    const academicYearId =
      tenantStore.academicYearId || user.defaultAcademicYearId;

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

    const itemsData = [];
    for (const item of items) {
      itemsData.push({
        itemType: item.itemType,
        plannedQuantity: item.plannedQuantity || 0,
        issuedQuantity: 0,
        usedQuantity: 0,
        unusedQuantity: 0,
        returnedQuantity: 0,
        damagedQuantity: 0,
        remarks: item.remarks || null,
      });
    }

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

  return sequelize.transaction(async (transaction) => {
    const bundle = await repo.getBundleById(bundleId, { transaction });
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

    const bundleUpdateFields = {};
    if (status) {
      bundleUpdateFields.status = status;
      if (status === "ISSUED") {
        if (!issuedTo) {
          const error = new Error("issuedTo is required to issue the bundle");
          error.statusCode = 400;
          throw error;
        }

        const invigilators = await repo.getActiveInvigilatorsForRoomSlot(
          bundle.classRoomSectionId,
          bundle.examDate,
          bundle.examinationSessionSlotId,
          transaction,
        );

        let isInvigilator = false;
        for (const ia of invigilators) {
          if (Number(ia.userId) === Number(issuedTo)) {
            isInvigilator = true;
            break;
          }
        }
        if (!isInvigilator) {
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
        const existingItems = await repo.getBundleItemsByBundleId(bundleId, {
          transaction,
        });
        const itemTypes = new Set();
        for (const item of existingItems) {
          itemTypes.add(item.itemType);
        }
        if (items && items.length > 0) {
          for (const item of items) {
            itemTypes.add(item.itemType);
          }
        }

        const requiredTypes = [
          "QUESTION_PAPER",
          "ANSWER_SHEET",
          "ATTENDANCE_SHEET",
        ];
        const missingTypes = [];
        for (const type of requiredTypes) {
          if (!itemTypes.has(type)) missingTypes.push(type);
        }

        if (missingTypes.length > 0) {
          const error = new Error(
            `Cannot set bundle to READY status. Missing required material items: ${missingTypes.join(", ")}`,
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
      await repo.updateBundle(bundleId, bundleUpdateFields, { transaction });
    }

    if (items && items.length > 0) {
      const seenTypes = new Set();
      for (const item of items) {
        if (seenTypes.has(item.itemType)) {
          const error = new Error("Duplicate material types are not allowed");
          error.statusCode = 400;
          throw error;
        }
        seenTypes.add(item.itemType);
      }

      const existingItems = await repo.getBundleItemsByBundleId(bundleId, {
        transaction,
      });
      const existingItemMap = new Map();
      for (const existing of existingItems) {
        existingItemMap.set(
          existing.itemType,
          existing.examRoomMaterialItemId,
        );
      }

      const itemsToUpsert = [];
      for (const item of items) {
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
          createdBy: user.userId,
        };
        if (existingItemMap.has(item.itemType)) {
          data.examRoomMaterialItemId = existingItemMap.get(item.itemType);
        }
        itemsToUpsert.push(data);
      }

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
  const capacities = await repo.getSummaryCapacities({
    examinationSessionId,
  });

  const uniqueRooms = new Map();
  for (const capacity of capacities) {
    const key = `${capacity.classRoomSectionId}_${capacity["examSchedule.examDate"]}_${capacity["examSchedule.examinationSessionSlotId"]}`;
    uniqueRooms.set(key, {
      classRoomSectionId: capacity.classRoomSectionId,
      examDate: capacity["examSchedule.examDate"],
      examinationSessionSlotId:
        capacity["examSchedule.examinationSessionSlotId"],
    });
  }

  let roomCount = uniqueRooms.size;
  let pendingCount = 0;
  let issuedCount = 0;
  let closedCount = 0;

  if (roomCount > 0) {
    const classRoomSectionIds = [];
    const examDates = [];
    const slotIds = [];
    for (const room of uniqueRooms.values()) {
      classRoomSectionIds.push(room.classRoomSectionId);
      examDates.push(room.examDate);
      slotIds.push(room.examinationSessionSlotId);
    }

    const bundles = await repo.getSummaryBundles(
      classRoomSectionIds,
      examDates,
      slotIds,
    );

    const bundleMap = new Map();
    for (const bundle of bundles) {
      const key = `${bundle.classRoomSectionId}_${bundle.examDate}_${bundle.examinationSessionSlotId}`;
      bundleMap.set(key, bundle.status);
    }

    for (const [key] of uniqueRooms) {
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
    }
  }

  return {
    roomCount,
    bundleIssuePending: pendingCount,
    bundleIssued: issuedCount,
    bundleClosed: closedCount,
  };
}

export async function updateBundleStatus(bundleId, status, user) {
  return sequelize.transaction(async (transaction) => {
    const bundle = await repo.getBundleById(bundleId, { transaction });
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
    await repo.updateBundle(bundleId, bundleUpdateFields, { transaction });

    return getBundleByRoomDetails(
      bundle.classRoomSectionId,
      bundle.examDate,
      bundle.examinationSessionSlotId,
    );
  });
}

export async function getReadyBundleList(filters, pagination) {
  const result = await repo.getReadyBundleList(filters, pagination);

  const formattedRows = [];
  for (const bundleRecord of result.rows) {
    const bundle = bundleRecord.get({ plain: true });
    const items = bundle.items || [];

    let TotalMaterial = 0;
    let issuedmaterial = 0;
    for (const item of items) {
      TotalMaterial += item.plannedQuantity || 0;
      issuedmaterial += item.issuedQuantity || 0;
      const planned = item.plannedQuantity || 0;
      const issued = item.issuedQuantity || 0;
      item.pendingQuantity = Math.max(planned - issued, 0);
    }

    formattedRows.push({
      examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
      bundleCode: bundle.bundleCode,
      status: bundle.status,
      examDate: bundle.examDate,
      examinationSessionSlotId: bundle.examinationSessionSlotId,
      classRoomSectionId: bundle.classRoomSectionId,
      roomNumber: bundle.classRoom ? bundle.classRoom.roomNumber : null,
      totalMaterial: TotalMaterial,
      issuedMaterial: issuedmaterial,
      materialTypes: items.length,
      items,
      issuedToUser: bundle.recipientUser || null,
      issuedByUser: bundle.issuerUser || null,
      issuedAt: bundle.issuedAt,
      slot: bundle.examinationSessionSlot || null,
    });
  }

  return {
    rows: formattedRows,
    count: result.count,
  };
}

function findAnswerSheetItem(items) {
  for (const item of items) {
    if (item.itemType === "ANSWER_SHEET") return item;
  }
  return null;
}

function buildReceivedRoomGroup(plain) {
  const classRoom = plain.classRoom;
  const schedule = plain.examSchedule;
  const slot = schedule.examinationSessionSlot || {};
  const bundles = classRoom.materialBundles || [];
  const bundle = bundles.length > 0 ? bundles[0] : {};
  const items = bundle.items || [];
  const answerSheet = findAnswerSheetItem(items);

  return {
    classRoomSectionId: plain.classRoomSectionId,
    roomNumber: classRoom.roomNumber || "",
    examDate: schedule.examDate,
    examinationSessionSlotId: schedule.examinationSessionSlotId,
    slot: {
      examinationSessionSlotId: slot.examinationSessionSlotId || null,
      slotNumber: slot.slotNumber || null,
      startTime: slot.startTime || "",
      endTime: slot.endTime || "",
    },
    exams: [],
    totalStudentCount: 0,
    examRoomMaterialBundleId: bundle.examRoomMaterialBundleId || null,
    bundleCode: bundle.bundleCode || null,
    status: bundle.status || null,
    answerSheetCount: answerSheet ? answerSheet.plannedQuantity || 0 : 0,
    usedAnswerSheets: answerSheet ? answerSheet.usedQuantity || 0 : 0,
    items,
  };
}

function buildReceivedExamEntry(plain) {
  const schedule = plain.examSchedule;
  const subject = schedule.subjectSchedule;
  const seats = plain.seats || [];

  return {
    examScheduleRoomCapacityId: plain.examScheduleRoomCapacityId,
    examScheduleId: plain.examScheduleId,
    subjectId: subject ? subject.subjectId : null,
    subjectName: subject ? subject.subjectName : "",
    subjectCode: subject ? subject.subjectCode : "",
    studentCount: seats.length,
  };
}

function matchesReceivedRoomSearch(room, search) {
  const q = String(search).toLowerCase();
  if (room.roomNumber && room.roomNumber.toLowerCase().includes(q)) return true;
  if (room.bundleCode && room.bundleCode.toLowerCase().includes(q)) return true;
  return false;
}

/** Group RECEIVED bundles by room + date + slot (same shape as /rooms grouping). */
export async function getReceivedRooms(filters, pagination = {}) {
  const roomCapacities = await repo.getReceivedRoomsQuery(filters);
  if (!roomCapacities.length) return { rows: [], count: 0 };

  const roomMap = new Map();
  for (const capacity of roomCapacities) {
    const plain = capacity.get({ plain: true });
    const schedule = plain.examSchedule;
    const key = roomOccurrenceKey(
      plain.classRoomSectionId,
      schedule.examDate,
      schedule.examinationSessionSlotId,
    );

    if (!roomMap.has(key)) {
      roomMap.set(key, buildReceivedRoomGroup(plain));
    }

    const group = roomMap.get(key);
    const exam = buildReceivedExamEntry(plain);
    group.exams.push(exam);
    group.totalStudentCount += exam.studentCount;
  }

  const rooms = [];
  for (const room of roomMap.values()) {
    if (filters.search && !matchesReceivedRoomSearch(room, filters.search)) {
      continue;
    }
    rooms.push(room);
  }

  const page = pagination.page || 1;
  const limit = pagination.limit || 10;
  const offset = (page - 1) * limit;
  const pageRows = [];
  for (let i = offset; i < offset + limit && i < rooms.length; i++) {
    pageRows.push(rooms[i]);
  }

  return {
    rows: pageRows,
    count: rooms.length,
  };
}