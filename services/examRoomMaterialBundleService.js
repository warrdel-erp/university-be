import * as repo from "../repository/examRoomMaterialBundleRepository.js";
import sequelize from "../database/sequelizeConfig.js";

// Utility to generate bundle code
function generateBundleCode(seqId) {
  return `B-${String(seqId).padStart(4, "0")}`;
}

export async function getBundleList(filters, pagination) {
  const { limit = 10, page = 1 } = pagination;

  // 1. Fetch raw matching capacities
  const allRows = await repo.getRawBundleCapacities(filters);

  // 2. Perform in-memory grouping: room + date + slot
  const roomMap = new Map();

  for (const rc of allRows) {
    const roomId = rc.classRoomSectionId;
    const schedule = rc.examSchedule;
    const slot = schedule?.examinationSessionSlot;
    
    // Grouping key: classRoomSectionId + examDate + examinationSessionSlotId
    const key = `${roomId}_${schedule.examDate}_${schedule.examinationSessionSlotId}`;
    
    if (!roomMap.has(key)) {
      roomMap.set(key, {
        classRoomSectionId: roomId,
        roomNumber: rc.classRoom?.roomNumber,
        examDate: schedule.examDate,
        slot: slot ? {
          examinationSessionSlotId: slot.examinationSessionSlotId,
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
        } : null,
        exams: []
      });
    }

    const bundle = (rc.materialBundles && rc.materialBundles.length > 0)
      ? rc.materialBundles[0]
      : null;

    const quantities = {
      ANSWER_SHEET: 0,
      EXTRA_SHEET: 0,
      GRAPH_SHEET: 0,
      ROUGH_SHEET: 0,
      ATTENDANCE_SHEET: 0,
      ROOM_KIT: 0
    };

    if (bundle && bundle.items) {
      bundle.items.forEach(item => {
        quantities[item.itemType] = item.plannedQuantity || 0;
      });
    }

    roomMap.get(key).exams.push({
      examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
      examScheduleId: rc.examScheduleId,
      subjectId: schedule.subjectSchedule?.subjectId,
      subjectName: schedule.subjectSchedule?.subjectName,
      subjectCode: schedule.subjectSchedule?.subjectCode,
      courseId: schedule.subjectSchedule?.courseId,
      sessionId: schedule.sessionId,
      term: schedule.term,
      capacity: rc.capacity,
      bundle: bundle ? {
        examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
        bundleCode: bundle.bundleCode,
        status: bundle.status,
        materialQuantities: quantities,
        issuedTo: bundle.recipientUser ? { userId: bundle.recipientUser.userId, userName: bundle.recipientUser.userName } : null,
        issuedBy: bundle.issuerUser ? { userId: bundle.issuerUser.userId, userName: bundle.issuerUser.userName } : null,
        issuedAt: bundle.issuedAt
      } : null
    });
  }

  // 3. Filter/Search by subjectName / subjectCode / bundleCode if `search` is provided
  let allUniqueRooms = Array.from(roomMap.values());
  const searchVal = filters.search?.toLowerCase();
  
  if (searchVal) {
    allUniqueRooms = allUniqueRooms.filter(room => {
      return room.exams.some(exam => {
        const matchesSubject = exam.subjectName?.toLowerCase().includes(searchVal) ||
                               exam.subjectCode?.toLowerCase().includes(searchVal);
        const matchesBundleCode = exam.bundle?.bundleCode?.toLowerCase().includes(searchVal);
        return matchesSubject || matchesBundleCode;
      });
    });
  }

  const total = allUniqueRooms.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  const paginatedRooms = allUniqueRooms.slice(offset, offset + limitNum);

  // 4. Batch-fetch student counts to avoid N+1 for final output
  const capacityIds = [];
  paginatedRooms.forEach(room => {
    room.exams.forEach(exam => {
      capacityIds.push(exam.examScheduleRoomCapacityId);
    });
  });

  const studentCounts = capacityIds.length 
    ? await repo.getStudentCountsForRoomCapacities(capacityIds)
    : [];

  const studentCountMap = new Map(
    studentCounts.map(sc => [sc.examScheduleRoomCapacityId, parseInt(sc.studentCount, 10) || 0])
  );

  paginatedRooms.forEach(room => {
    room.exams.forEach(exam => {
      exam.studentCount = studentCountMap.get(exam.examScheduleRoomCapacityId) || 0;
    });
  });

  return {
    rows: paginatedRooms,
    count: total
  };
}

export async function getBundleById(id) {
  const bundle = await repo.getBundleById(id);
  if (!bundle) {
    const error = new Error("Bundle not found");
    error.statusCode = 404;
    throw error;
  }
  
  const plainBundle = bundle.get({ plain: true });
  
  // Calculate pendingQuantity
  if (plainBundle.items) {
    plainBundle.items.forEach(item => {
      const planned = item.plannedQuantity || 0;
      const issued = item.issuedQuantity || 0;
      item.pendingQuantity = Math.max(planned - issued, 0);
    });
  }
  
  // Get student count
  const studentCount = await repo.getStudentCountForRoomCapacity(plainBundle.examScheduleRoomCapacityId);
  plainBundle.studentCount = studentCount;
  
  // Format slightly to match expected structure
  const result = {
    examRoomMaterialBundleId: plainBundle.examRoomMaterialBundleId,
    bundleCode: plainBundle.bundleCode,
    status: plainBundle.status,
    examScheduleId: plainBundle.examScheduleId,
    examScheduleRoomCapacityId: plainBundle.examScheduleRoomCapacityId,
    
    subjectName: plainBundle.examSchedule?.subjectSchedule?.subjectName,
    subjectCode: plainBundle.examSchedule?.subjectSchedule?.subjectCode,
    
    examDate: plainBundle.examSchedule?.examDate,
    slot: plainBundle.examSchedule?.examinationSessionSlot ? {
      startTime: plainBundle.examSchedule.examinationSessionSlot.startTime,
      endTime: plainBundle.examSchedule.examinationSessionSlot.endTime,
    } : null,
    
    room: plainBundle.roomCapacity?.classRoom ? {
      classRoomSectionId: plainBundle.roomCapacity.classRoom.classRoomSectionId,
      roomNumber: plainBundle.roomCapacity.classRoom.roomNumber,
    } : null,
    
    studentCount,
    
    items: plainBundle.items || [],
    
    issuedToUser: plainBundle.recipientUser,
    issuedByUser: plainBundle.issuerUser,
    issuedAt: plainBundle.issuedAt,
    
    receivedByUser: plainBundle.receiverUser,
    receivedAt: plainBundle.receivedAt,
    
    verifiedByUser: plainBundle.verifierUser,
    verifiedAt: plainBundle.verifiedAt,
    
    remarks: plainBundle.remarks
  };
  
  return result;
}

export async function createBundle(payload, user) {
  const { examScheduleId, examScheduleRoomCapacityId, items } = payload;
  
  // Validations
  const schedule = await repo.findScheduleById(examScheduleId);
  if (!schedule) {
    const error = new Error("Exam schedule not found");
    error.statusCode = 404;
    throw error;
  }
  
  const roomCapacity = await repo.findRoomCapacityWithSchedule(examScheduleRoomCapacityId);
  if (!roomCapacity) {
    const error = new Error("Room capacity not found");
    error.statusCode = 404;
    throw error;
  }
  
  if (roomCapacity.examSchedule?.examScheduleId !== examScheduleId) {
    const error = new Error("Room capacity does not belong to the provided exam schedule");
    error.statusCode = 400;
    throw error;
  }
  
  return await sequelize.transaction(async (transaction) => {
    // Check duplicate
    const existing = await repo.findBundleByMapping(examScheduleId, examScheduleRoomCapacityId, transaction);
    if (existing) {
      const error = new Error("A bundle already exists for this exam schedule and room");
      error.statusCode = 400;
      throw error;
    }
    
    // Generate Bundle Code
    const maxId = await repo.getMaxBundleId(transaction);
    const bundleCode = generateBundleCode(maxId + 1);
    
    const bundleData = {
      examScheduleId,
      examScheduleRoomCapacityId,
      bundleCode,
      status: "PREPARING",
      universityId: user.universityId,
      instituteId: user.defaultInstituteId,
      academicYearId: user.defaultAcademicYearId,
      createdBy: user.userId,
      updatedBy: user.userId,
    };
    
    const itemsData = items.map(item => ({
      itemType: item.itemType,
      plannedQuantity: item.plannedQuantity || 0,
      remarks: item.remarks || null
    }));
    
    return await repo.createBundle(bundleData, itemsData, transaction);
  });
}

export async function updateBundleItems(bundleId, items, user) {
  return await sequelize.transaction(async (transaction) => {
    const bundle = await repo.getBundleById(bundleId);
    if (!bundle) {
      const error = new Error("Bundle not found");
      error.statusCode = 404;
      throw error;
    }
    
    if (["ISSUED", "RECEIVED", "VERIFIED", "CLOSED"].includes(bundle.status)) {
      const error = new Error(`Cannot update items when bundle is in ${bundle.status} status`);
      error.statusCode = 400;
      throw error;
    }
    
    // Check for duplicate itemTypes in payload
    const itemTypes = items.map(i => i.itemType);
    if (new Set(itemTypes).size !== itemTypes.length) {
      const error = new Error("Duplicate material types are not allowed");
      error.statusCode = 400;
      throw error;
    }
    
    const existingItems = await repo.getBundleItemsByBundleId(bundleId);
    const existingItemMap = new Map();
    existingItems.forEach(i => existingItemMap.set(i.itemType, i.examRoomMaterialItemId));
    
    const itemsToUpsert = items.map(item => {
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
        updatedAt: new Date()
      };
      
      // If it exists, provide the ID for bulkCreate updateOnDuplicate to work properly
      if (existingItemMap.has(item.itemType)) {
        data.examRoomMaterialItemId = existingItemMap.get(item.itemType);
      } else {
        data.createdBy = user.userId;
      }
      
      return data;
    });
    
    return await repo.updateBundleItems(bundleId, itemsToUpsert, transaction);
  });
}

export async function markReady(bundleId, user) {
  return await sequelize.transaction(async (transaction) => {
    const bundle = await repo.getBundleById(bundleId);
    if (!bundle) {
      const error = new Error("Bundle not found");
      error.statusCode = 404;
      throw error;
    }
    
    if (bundle.status !== "PREPARING") {
      const error = new Error(`Cannot transition from ${bundle.status} to READY. Current status must be PREPARING.`);
      error.statusCode = 400;
      throw error;
    }
    
    // Validate quantities
    const items = await repo.getBundleItemsByBundleId(bundleId);
    const pendingItems = [];
    
    items.forEach(item => {
      const planned = item.plannedQuantity || 0;
      const issued = item.issuedQuantity || 0;
      if (planned > 0 && issued < planned) {
        pendingItems.push(item.itemType);
      }
    });
    
    if (pendingItems.length > 0) {
      const error = new Error(`Cannot mark as READY. The following items have insufficient issued quantities: ${pendingItems.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    
    const updates = {
      status: "READY",
      updatedBy: user.userId,
      updatedAt: new Date()
    };
    
    return await repo.updateBundleStatus(bundleId, updates, transaction);
  });
}

export async function reopenBundle(bundleId, user) {
  return await sequelize.transaction(async (transaction) => {
    const bundle = await repo.getBundleById(bundleId);
    if (!bundle) {
      const error = new Error("Bundle not found");
      error.statusCode = 404;
      throw error;
    }
    
    if (bundle.status !== "READY") {
      const error = new Error(`Cannot reopen bundle. Status must be READY, but is currently ${bundle.status}.`);
      error.statusCode = 400;
      throw error;
    }
    
    const updates = {
      status: "PREPARING",
      updatedBy: user.userId,
      updatedAt: new Date()
    };
    
    return await repo.updateBundleStatus(bundleId, updates, transaction);
  });
}

export async function updateBundleStatus(bundleId, statusData, user) {
  const { status, remarks, issuedTo } = statusData;
  
  return await sequelize.transaction(async (transaction) => {
    const bundle = await repo.getBundleById(bundleId);
    if (!bundle) {
      const error = new Error("Bundle not found");
      error.statusCode = 404;
      throw error;
    }
    
    const validTransitions = {
      "READY": ["ISSUED"],
      "ISSUED": ["RECEIVED"],
      "RECEIVED": ["VERIFIED"],
      "VERIFIED": ["CLOSED"]
    };
    
    if (!validTransitions[bundle.status] || !validTransitions[bundle.status].includes(status)) {
      const error = new Error(`Invalid status transition from ${bundle.status} to ${status}`);
      error.statusCode = 400;
      throw error;
    }
    
    const updates = {
      status,
      updatedBy: user.userId,
      updatedAt: new Date()
    };
    
    if (remarks !== undefined) {
      updates.remarks = remarks;
    }
    
    const now = new Date();
    
    if (status === "ISSUED") {
      if (!issuedTo) {
         const error = new Error("issuedTo user ID is required when issuing a bundle");
         error.statusCode = 400;
         throw error;
      }
      updates.issuedTo = issuedTo;
      updates.issuedBy = user.userId;
      updates.issuedAt = now;
    } else if (status === "RECEIVED") {
      updates.receivedBy = user.userId;
      updates.receivedAt = now;
    } else if (status === "VERIFIED") {
      updates.verifiedBy = user.userId;
      updates.verifiedAt = now;
    }
    
    return await repo.updateBundleStatus(bundleId, updates, transaction);
  });
}

export async function bulkPrepare(roomCapacityIds, defaultItems, user) {
  if (!roomCapacityIds || roomCapacityIds.length === 0) {
    return { createdCount: 0, alreadyExistingCount: 0, failedCount: 0 };
  }
  
  return await sequelize.transaction(async (transaction) => {
    // 1. Get all room capacities to find valid ones and their schedules
    const roomCapacities = [];
    for (const id of roomCapacityIds) {
      const rc = await repo.findRoomCapacityWithSchedule(id);
      if (rc && rc.examSchedule) {
        roomCapacities.push(rc);
      }
    }
    
    const validCapacityIds = roomCapacities.map(rc => rc.examScheduleRoomCapacityId);
    if (validCapacityIds.length === 0) {
       return { createdCount: 0, alreadyExistingCount: 0, failedCount: roomCapacityIds.length };
    }
    
    // 2. Find existing bundles
    const existingBundles = await repo.bulkFindExistingBundles(validCapacityIds);
    const existingCapacitySet = new Set(existingBundles.map(b => b.examScheduleRoomCapacityId));
    
    // 3. Filter capacities that need bundles
    const capacitiesToCreate = roomCapacities.filter(rc => !existingCapacitySet.has(rc.examScheduleRoomCapacityId));
    
    if (capacitiesToCreate.length === 0) {
      return { 
        createdCount: 0, 
        alreadyExistingCount: existingBundles.length, 
        failedCount: roomCapacityIds.length - validCapacityIds.length 
      };
    }
    
    // 4. Create bundles
    let currentMaxId = await repo.getMaxBundleId(transaction);
    
    const bundlesData = capacitiesToCreate.map((rc, index) => {
      return {
        examScheduleId: rc.examSchedule.examScheduleId,
        examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
        bundleCode: generateBundleCode(currentMaxId + 1 + index),
        status: "PREPARING",
        universityId: user.universityId,
        instituteId: user.defaultInstituteId,
        academicYearId: user.defaultAcademicYearId,
        createdBy: user.userId,
        updatedBy: user.userId,
      };
    });
    
    const createdBundles = await repo.bulkCreateBundles(bundlesData, transaction);
    
    // 5. Create default items
    if (defaultItems && defaultItems.length > 0) {
      const itemsData = [];
      for (const bundle of createdBundles) {
        for (const item of defaultItems) {
          itemsData.push({
            examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
            itemType: item.itemType,
            plannedQuantity: item.plannedQuantity || 0,
            createdBy: user.userId,
            updatedBy: user.userId,
          });
        }
      }
      
      if (itemsData.length > 0) {
         // use bulkCreate
         await sequelize.models.exam_room_material_item.bulkCreate(itemsData, { transaction });
      }
    }
    
    return {
      createdCount: createdBundles.length,
      alreadyExistingCount: existingBundles.length,
      failedCount: roomCapacityIds.length - validCapacityIds.length,
      createdBundleIds: createdBundles.map(b => b.examRoomMaterialBundleId)
    };
  });
}

export async function getBundleCoverData(bundleId) {
  const plainBundle = await getBundleById(bundleId);
  
  // Format purely for cover printing
  return {
    examRoomMaterialBundleId: plainBundle.examRoomMaterialBundleId,
    bundleCode: plainBundle.bundleCode,
    examScheduleId: plainBundle.examScheduleId,
    subjectName: plainBundle.subjectName,
    subjectCode: plainBundle.subjectCode,
    examDate: plainBundle.examDate,
    slot: plainBundle.slot,
    roomNumber: plainBundle.room?.roomNumber,
    studentCount: plainBundle.studentCount,
    items: plainBundle.items.map(item => ({
      itemType: item.itemType,
      plannedQuantity: item.plannedQuantity,
      issuedQuantity: item.issuedQuantity
    }))
  };
}
