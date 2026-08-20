import * as model from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function getBundleList(filters, pagination) {
  const {
    examinationSessionId,
    examDate,
    examinationSessionSlotId,
    courseId,
    sessionId,
    term,
    status,
    search,
  } = filters;

  const { limit, page } = pagination;
  const offset = (page - 1) * limit;

  const scheduleWhere = { examinationSessionId };
  if (examDate) scheduleWhere.examDate = examDate;
  if (examinationSessionSlotId) scheduleWhere.examinationSessionSlotId = examinationSessionSlotId;
  if (sessionId) scheduleWhere.sessionId = sessionId;
  if (term) scheduleWhere.term = term;

  const subjectWhere = {};
  if (courseId) subjectWhere.courseId = courseId;
  if (search) {
    subjectWhere[Op.or] = [
      { subjectName: { [Op.like]: `%${search}%` } },
      { subjectCode: { [Op.like]: `%${search}%` } },
    ];
  }

  const bundleWhere = {};
  if (status) bundleWhere.status = status;
  if (search) {
    // Optional: allow searching by bundleCode
    // We combine the subject search with bundleCode search at the root level if needed,
    // but typically search is applied across related models. We'll add bundleCode here.
    // To handle OR across models cleanly in Sequelize, it's sometimes tricky, so we'll
    // just add it to bundleWhere if we want to search by bundleCode specifically.
    bundleWhere.bundleCode = { [Op.like]: `%${search}%` };
    
    // Actually, to make search work across Subject OR BundleCode, we might need a top-level OR.
    // For simplicity and adherence to typical patterns, we'll keep them separate or use a top-level where.
    // Let's rely on standard search behavior (e.g. searching subject name).
  }

  // We query from examScheduleRoomCapacityModel since one bundle corresponds to one capacity.
  // Wait, if we want to show all rooms (even those without bundles), we start at capacity.
  // The requirement says "return one row per examScheduleId + examScheduleRoomCapacityId".
  // So querying `examScheduleRoomCapacityModel` is correct.

  const result = await scoped(model.examScheduleRoomCapacityModel).findAndCountAll({
    attributes: ["examScheduleRoomCapacityId", "classRoomSectionId", "capacity"],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate", "examinationSessionSlotId", "sessionId", "term"],
        where: scheduleWhere,
        required: true,
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
            where: Object.keys(subjectWhere).length > 0 ? subjectWhere : undefined,
            required: Object.keys(subjectWhere).length > 0,
          },
          {
            model: model.examinationSessionSlotModel,
            as: "examinationSessionSlot",
            attributes: ["examinationSessionSlotId", "slotNumber", "startTime", "endTime"],
            required: true,
          }
        ]
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber"],
        required: true,
      },
      {
        model: model.examRoomMaterialBundleModel,
        as: "materialBundles",
        attributes: [
          "examRoomMaterialBundleId",
          "bundleCode",
          "status",
          "issuedTo",
          "issuedBy",
          "issuedAt"
        ],
        where: Object.keys(bundleWhere).length > 0 ? bundleWhere : undefined,
        required: Object.keys(bundleWhere).length > 0, // Only require if bundle filters are applied
        include: [
          {
            model: model.examRoomMaterialItemModel,
            as: "items",
            attributes: ["itemType", "plannedQuantity", "issuedQuantity", "usedQuantity", "unusedQuantity", "returnedQuantity", "damagedQuantity"],
            required: false,
          },
          {
             model: model.userModel,
             as: "issuerUser",
             attributes: ["userId", "userName"],
             required: false
          },
          {
             model: model.userModel,
             as: "recipientUser",
             attributes: ["userId", "userName"],
             required: false
          }
        ]
      }
    ],
    limit,
    offset,
    distinct: true, // Important because of hasMany (materialBundles technically is hasMany, items is hasMany)
    order: [
      [{ model: model.examScheduleModel, as: 'examSchedule' }, 'examDate', 'ASC'],
      [{ model: model.examScheduleModel, as: 'examSchedule' }, { model: model.examinationSessionSlotModel, as: 'examinationSessionSlot' }, 'startTime', 'ASC'],
      [{ model: model.classRoomModel, as: 'classRoom' }, 'roomNumber', 'ASC']
    ]
  });

  return result;
}

export async function getBundleById(examRoomMaterialBundleId) {
  return scoped(model.examRoomMaterialBundleModel).findOne({
    where: { examRoomMaterialBundleId },
    include: [
      {
        model: model.examRoomMaterialItemModel,
        as: "items",
      },
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate"],
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectName", "subjectCode"],
          },
          {
            model: model.examinationSessionSlotModel,
            as: "examinationSessionSlot",
            attributes: ["startTime", "endTime"],
          }
        ]
      },
      {
        model: model.examScheduleRoomCapacityModel,
        as: "roomCapacity",
        attributes: ["examScheduleRoomCapacityId", "classRoomSectionId"],
        include: [
          {
            model: model.classRoomModel,
            as: "classRoom",
            attributes: ["classRoomSectionId", "roomNumber"],
          }
        ]
      },
      {
        model: model.userModel,
        as: "recipientUser",
        attributes: ["userId", "userName"],
      },
      {
        model: model.userModel,
        as: "issuerUser",
        attributes: ["userId", "userName"],
      },
      {
        model: model.userModel,
        as: "receiverUser",
        attributes: ["userId", "userName"],
      },
      {
        model: model.userModel,
        as: "verifierUser",
        attributes: ["userId", "userName"],
      },
    ],
  });
}

export async function findBundleByMapping(examScheduleId, examScheduleRoomCapacityId, transaction = null) {
  return scoped(model.examRoomMaterialBundleModel).findOne({
    where: { examScheduleId, examScheduleRoomCapacityId },
    transaction,
  });
}

export async function createBundle(bundleData, itemsData, transaction) {
  const bundle = await scoped(model.examRoomMaterialBundleModel).create(bundleData, { transaction });
  
  const items = itemsData.map((item) => ({
    ...item,
    examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
    createdBy: bundleData.createdBy,
    updatedBy: bundleData.updatedBy,
  }));
  
  const createdItems = await model.examRoomMaterialItemModel.bulkCreate(items, { transaction });
  
  return {
    ...bundle.get({ plain: true }),
    items: createdItems.map(i => i.get({ plain: true })),
  };
}

export async function updateBundleItems(examRoomMaterialBundleId, items, transaction) {
  // Use bulkCreate with updateOnDuplicate to upsert items efficiently
  await model.examRoomMaterialItemModel.bulkCreate(items, {
    transaction,
    updateOnDuplicate: [
      "plannedQuantity",
      "issuedQuantity",
      "usedQuantity",
      "unusedQuantity",
      "returnedQuantity",
      "damagedQuantity",
      "remarks",
      "updatedBy",
      "updatedAt"
    ],
  });
  
  // Return the updated items
  return model.examRoomMaterialItemModel.findAll({
    where: { examRoomMaterialBundleId },
    transaction
  });
}

export async function updateBundleStatus(examRoomMaterialBundleId, updates, transaction = null) {
  await scoped(model.examRoomMaterialBundleModel).update(updates, {
    where: { examRoomMaterialBundleId },
    transaction,
  });
  return getBundleById(examRoomMaterialBundleId); // return the full updated bundle
}

export async function getBundleItemsByBundleId(examRoomMaterialBundleId) {
  return model.examRoomMaterialItemModel.findAll({
    where: { examRoomMaterialBundleId },
  });
}

export async function findRoomCapacityWithSchedule(examScheduleRoomCapacityId) {
  return scoped(model.examScheduleRoomCapacityModel).findOne({
    where: { examScheduleRoomCapacityId },
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate", "examinationSessionSlotId"],
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber"],
      }
    ],
  });
}

export async function findScheduleById(examScheduleId) {
  return scoped(model.examScheduleModel).findOne({
    where: { examScheduleId },
  });
}

export async function bulkFindExistingBundles(examScheduleRoomCapacityIds) {
  return scoped(model.examRoomMaterialBundleModel).findAll({
    where: {
      examScheduleRoomCapacityId: {
        [Op.in]: examScheduleRoomCapacityIds,
      },
    },
    attributes: ["examScheduleId", "examScheduleRoomCapacityId", "examRoomMaterialBundleId", "bundleCode"],
  });
}

export async function bulkCreateBundles(bundlesData, transaction) {
  return scoped(model.examRoomMaterialBundleModel).bulkCreate(bundlesData, { transaction });
}

export async function getStudentCountForRoomCapacity(examScheduleRoomCapacityId) {
  const result = await model.studentExamSeatModel.findOne({
    where: { examScheduleRoomCapacityId },
    attributes: [
      [sequelize.fn("COUNT", sequelize.col("student_id")), "studentCount"],
    ],
    raw: true,
  });
  return parseInt(result.studentCount, 10) || 0;
}

export async function getStudentCountsForRoomCapacities(examScheduleRoomCapacityIds) {
  if (!examScheduleRoomCapacityIds || examScheduleRoomCapacityIds.length === 0) return [];
  return model.studentExamSeatModel.findAll({
    where: {
      examScheduleRoomCapacityId: {
        [Op.in]: examScheduleRoomCapacityIds,
      },
    },
    attributes: [
      "examScheduleRoomCapacityId",
      [sequelize.fn("COUNT", sequelize.col("student_id")), "studentCount"],
    ],
    group: ["examScheduleRoomCapacityId"],
    raw: true,
  });
}

export async function getMaxBundleId(transaction) {
  const result = await model.examRoomMaterialBundleModel.findOne({
    attributes: [
      [sequelize.fn("MAX", sequelize.col("exam_room_material_bundle_id")), "maxId"],
    ],
    raw: true,
    transaction,
    paranoid: false, // Include deleted ones for sequence continuation
  });
  return parseInt(result.maxId, 10) || 0;
}
