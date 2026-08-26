import * as model from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import { buildScope, scoped } from "../utility/scoped.js";
import * as examinationSessionRepository from "./examinationSessionRepository.js";
import { getSeatCountsByCapacityIds } from "../utility/roomCapacity.js";
import { INVIGILATOR_ASSIGNMENT_INACTIVE_STATUSES } from "../constant.js";

/** Resolve selections → schedule.sessionId + subject (courseId, term) filters. */
async function applySelectionFilters(selections, scheduleWhere, subjectWhere, options = {}) {
  if (!selections || selections.length === 0) return;

  const mappingIds = [];
  for (const sel of selections) {
    mappingIds.push(sel.courseSessionMappingId);
  }

  const dbMappings =
    await examinationSessionRepository.findSessionCourseMappingsByIds(
      mappingIds,
      options,
    );
  const dbMappingsMap = new Map();
  for (const mapping of dbMappings) {
    dbMappingsMap.set(mapping.sessionCourseMappingId, mapping);
  }

  const filterCombinations = [];
  for (const sel of selections) {
    const mapping = dbMappingsMap.get(sel.courseSessionMappingId);
    if (!mapping) continue;
    filterCombinations.push({
      courseId: mapping.courseId,
      sessionId: mapping.sessionId,
      terms: sel.terms || [],
    });
  }
  if (!filterCombinations.length) return;

  const sessionIds = [];
  const orSubjects = [];
  for (const comb of filterCombinations) {
    sessionIds.push(comb.sessionId);
    orSubjects.push({
      courseId: comb.courseId,
      term: { [Op.in]: comb.terms },
    });
  }

  const uniqueSessionIds = [...new Set(sessionIds)];
  scheduleWhere.sessionId =
    uniqueSessionIds.length === 1
      ? uniqueSessionIds[0]
      : { [Op.in]: uniqueSessionIds };
  subjectWhere[Op.or] = orSubjects;
}

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
    selections,
  } = filters;

  const { limit, page } = pagination;
  const offset = (page - 1) * limit;

  const scheduleWhere = { examinationSessionId };
  if (examDate) scheduleWhere.examDate = examDate;
  if (examinationSessionSlotId) {
    scheduleWhere.examinationSessionSlotId = examinationSessionSlotId;
  }

  const subjectWhere = {};
  if (courseId) subjectWhere.courseId = courseId;
  if (search) {
    subjectWhere[Op.or] = [
      { subjectName: { [Op.like]: `%${search}%` } },
      { subjectCode: { [Op.like]: `%${search}%` } },
    ];
  }

  if (selections && selections.length > 0) {
    await applySelectionFilters(selections, scheduleWhere, subjectWhere);
  } else {
    if (sessionId) scheduleWhere.sessionId = sessionId;
    if (term) scheduleWhere.term = term;
  }

  const bundleWhere = {};
  if (status) bundleWhere.status = status;
  if (search) {
    bundleWhere.bundleCode = { [Op.like]: `%${search}%` };
  }

  const { count, rows } = await scoped(
    model.examScheduleRoomCapacityModel,
  ).findAndCountAll({
    subQuery: false,
    attributes: [
      "examScheduleRoomCapacityId",
      "classRoomSectionId",
      "capacity",
    ],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: [
          "examScheduleId",
          "examDate",
          "examinationSessionSlotId",
          "sessionId",
          "term",
        ],
        where: scheduleWhere,
        required: true,
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
            where:
              Object.keys(subjectWhere).length > 0 ? subjectWhere : undefined,
            required: true,
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
            required: true,
          },
        ],
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber", "capacity", "examCapacity"],
        required: true,
        include: [
          {
            model: model.examInvigilatorAssignmentModel,
            as: "examInvigilatorAssignments",
            attributes: [
              "userId",
              "role",
              "examDate",
              "examinationSessionSlotId",
            ],
            required: false,
            where: sequelize.and(
              sequelize.where(
                sequelize.col("classRoom.examInvigilatorAssignments.exam_date"),
                "=",
                sequelize.col("examSchedule.exam_date"),
              ),
              sequelize.where(
                sequelize.col(
                  "classRoom.examInvigilatorAssignments.examination_session_slot_id",
                ),
                "=",
                sequelize.col("examSchedule.examination_session_slot_id"),
              ),
            ),
            include: [
              {
                model: model.users,
                as: "user",
                attributes: ["userId", "userName"],
              },
            ],
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
              "issuedAt",
            ],
            required: false,
            where: sequelize.and(
              sequelize.where(
                sequelize.col("classRoom.materialBundles.exam_date"),
                "=",
                sequelize.col("examSchedule.exam_date"),
              ),
              sequelize.where(
                sequelize.col(
                  "classRoom.materialBundles.examination_session_slot_id",
                ),
                "=",
                sequelize.col("examSchedule.examination_session_slot_id"),
              ),
            ),
            include: [
              {
                model: model.examRoomMaterialItemModel,
                as: "items",
                attributes: [
                  "itemType",
                  "plannedQuantity",
                  "issuedQuantity",
                  "usedQuantity",
                  "unusedQuantity",
                  "returnedQuantity",
                  "damagedQuantity",
                ],
                required: false,
              },
              {
                model: model.users,
                as: "issuerUser",
                attributes: ["userId", "userName"],
                required: false,
              },
              {
                model: model.users,
                as: "recipientUser",
                attributes: ["userId", "userName"],
                required: false,
              },
            ],
          },
        ],
      },
    ],
    limit,
    offset,
    distinct: true,
    order: [
      [
        { model: model.examScheduleModel, as: "examSchedule" },
        "examDate",
        "ASC",
      ],
      [
        { model: model.examScheduleModel, as: "examSchedule" },
        {
          model: model.examinationSessionSlotModel,
          as: "examinationSessionSlot",
        },
        "startTime",
        "ASC",
      ],
      [{ model: model.classRoomModel, as: "classRoom" }, "roomNumber", "ASC"],
    ],
  });

  return {
    rows,
    count,
  };
}

export async function getBundleById(examRoomMaterialBundleId, options = {}) {
  return scoped(model.examRoomMaterialBundleModel).findOne({
    where: { examRoomMaterialBundleId },
    include: [
      {
        model: model.examRoomMaterialItemModel,
        as: "items",
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber"],
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
    transaction: options.transaction,
  });
}

export async function findBundleByMapping(
  examDate,
  examinationSessionSlotId,
  classRoomSectionId,
  transaction = null,
) {
  return scoped(model.examRoomMaterialBundleModel).findOne({
    where: { examDate, examinationSessionSlotId, classRoomSectionId },
    transaction,
  });
}

export async function findRoomCapacityByRoomDateSlot(
  classRoomSectionId,
  examDate,
  examinationSessionSlotId,
  options = {},
) {
  return scoped(model.examScheduleRoomCapacityModel).findOne({
    where: { classRoomSectionId: Number(classRoomSectionId) },
    attributes: ["examScheduleRoomCapacityId", "classRoomSectionId", "capacity"],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        where: {
          examDate,
          examinationSessionSlotId: Number(examinationSessionSlotId),
        },
        required: true,
        attributes: ["examScheduleId", "examDate", "examinationSessionSlotId"],
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber"],
        required: true,
      },
    ],
    transaction: options.transaction,
  });
}

export async function countBundlesByRoom(classRoomSectionId, options = {}) {
  return scoped(model.examRoomMaterialBundleModel).count({
    where: { classRoomSectionId: Number(classRoomSectionId) },
    transaction: options.transaction,
    paranoid: false,
  });
}

export async function updateBundle(
  examRoomMaterialBundleId,
  updateData,
  options = {},
) {
  await scoped(model.examRoomMaterialBundleModel).update(updateData, {
    where: { examRoomMaterialBundleId: Number(examRoomMaterialBundleId) },
    transaction: options.transaction,
  });
  return getBundleById(examRoomMaterialBundleId, options);
}

export async function createBundle(bundleData, itemsData, transaction) {
  const bundle = await scoped(model.examRoomMaterialBundleModel).create(
    bundleData,
    { transaction },
  );

  const items = [];
  for (const item of itemsData) {
    items.push({
      ...item,
      examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
      createdBy: bundleData.createdBy,
      updatedBy: bundleData.updatedBy,
    });
  }

  const createdItems = await model.examRoomMaterialItemModel.bulkCreate(items, {
    transaction,
  });

  const plainItems = [];
  for (const row of createdItems) {
    plainItems.push(row.get({ plain: true }));
  }

  return {
    ...bundle.get({ plain: true }),
    items: plainItems,
  };
}

export async function updateBundleItems(
  examRoomMaterialBundleId,
  items,
  transaction,
) {
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
      "updatedAt",
    ],
  });

  // Return the updated items
  return model.examRoomMaterialItemModel.findAll({
    where: { examRoomMaterialBundleId },
    transaction,
  });
}

export async function getBundleItemsByBundleId(
  examRoomMaterialBundleId,
  options = {},
) {
  return model.examRoomMaterialItemModel.findAll({
    where: { examRoomMaterialBundleId },
    transaction: options.transaction,
  });
}

export async function getStudentCountForRoomCapacity(
  examScheduleRoomCapacityId,
) {
  const result = await model.studentExamSeatModel.findOne({
    where: { examScheduleRoomCapacityId },
    attributes: [
      [sequelize.fn("COUNT", sequelize.col("student_id")), "studentCount"],
    ],
    raw: true,
  });
  return parseInt(result.studentCount, 10) || 0;
}

export async function getSummaryCapacities(scheduleWhere) {
  return await scoped(model.examScheduleRoomCapacityModel).findAll({
    attributes: ["classRoomSectionId"],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: ["examDate", "examinationSessionSlotId"],
        where: scheduleWhere,
        required: true,
      },
    ],
    raw: true,
  });
}

export async function getSummaryBundles(
  classRoomSectionIds,
  examDates,
  slotIds,
) {
  return await scoped(model.examRoomMaterialBundleModel).findAll({
    where: {
      classRoomSectionId: { [Op.in]: classRoomSectionIds },
      examDate: { [Op.in]: examDates },
      examinationSessionSlotId: { [Op.in]: slotIds },
    },
    raw: true,
  });
}

export async function getSeatCounts(capacityIds, options = {}) {
  return getSeatCountsByCapacityIds(capacityIds, options);
}

export async function getActiveInvigilatorsForRoomSlot(
  classRoomSectionId,
  examDate,
  examinationSessionSlotId,
  transaction,
) {
  return scoped(model.examInvigilatorAssignmentModel).findAll({
    where: {
      classRoomSectionId,
      examDate,
      examinationSessionSlotId,
      status: { [Op.notIn]: INVIGILATOR_ASSIGNMENT_INACTIVE_STATUSES },
    },
    attributes: ["userId"],
    transaction,
  });
}

export async function getInvigilators(
  examinationSessionSlotId,
  examDate,
  classRoomSectionId,
) {
  return scoped(model.examInvigilatorAssignmentModel).findAll({
    where: {
      examinationSessionSlotId,
      examDate,
      classRoomSectionId,
      role: "INVIGILATOR",
    },
    include: [
      {
        model: model.userModel,
        as: "user",
        attributes: ["userId", "userName"],
      },
    ],
  });
}

export async function getReadyBundleList(filters, pagination) {
  const {
    examinationSessionId,
    examDate,
    examinationSessionSlotId,
    search,
    selections,
  } = filters;

  const { limit, page } = pagination;
  const offset = (page - 1) * limit;

  const bundleWhere = { status: "READY" };
  if (examDate) bundleWhere.examDate = examDate;
  if (examinationSessionSlotId) bundleWhere.examinationSessionSlotId = examinationSessionSlotId;
  if (search) {
    bundleWhere.bundleCode = { [Op.like]: `%${search}%` };
  }

  const roomCapacityInclude = {
    model: model.examScheduleRoomCapacityModel,
    as: "roomCapacities",
    required: false,
    attributes: [],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        required: true,
        attributes: [],
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            required: true,
            attributes: [],
          }
        ]
      }
    ]
  };

  if (selections && selections.length > 0) {
    const scheduleWhere = {};
    const subjectWhere = {};
    await applySelectionFilters(selections, scheduleWhere, subjectWhere);
    if (scheduleWhere.sessionId != null || subjectWhere[Op.or]) {
      roomCapacityInclude.required = true;
      if (scheduleWhere.sessionId != null) {
        roomCapacityInclude.include[0].where = {
          sessionId: scheduleWhere.sessionId,
        };
      }
      if (subjectWhere[Op.or]) {
        roomCapacityInclude.include[0].include[0].where = {
          [Op.or]: subjectWhere[Op.or],
        };
      }
    }
  }

  const { count, rows } = await scoped(
    model.examRoomMaterialBundleModel,
  ).findAndCountAll({
    where: bundleWhere,
    include: [
      roomCapacityInclude,
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        where: { examinationSessionId },
        required: true,
        attributes: [
          "examinationSessionSlotId",
          "slotNumber",
          "startTime",
          "endTime",
        ],
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber", "capacity", "examCapacity"],
        required: true,
      },
      {
        model: model.examRoomMaterialItemModel,
        as: "items",
        attributes: [
          "itemType",
          "plannedQuantity",
          "issuedQuantity",
          "usedQuantity",
          "unusedQuantity",
          "returnedQuantity",
          "damagedQuantity",
        ],
        required: false,
      },
      {
        model: model.users,
        as: "issuerUser",
        attributes: ["userId", "userName"],
        required: false,
      },
      {
        model: model.users,
        as: "recipientUser",
        attributes: ["userId", "userName"],
        required: false,
      },
    ],
    limit,
    offset,
    distinct: true,
    order: [["examDate", "ASC"], ["bundleCode", "ASC"]],
  });

  return {
    rows,
    count,
  };
}

export async function getReceivedRoomsQuery(filters, options = {}) {
  const {
    examinationSessionId,
    examDate,
    examinationSessionSlotId,
    selections,
  } = filters;

  const scheduleWhere = { examinationSessionId };
  if (examDate) scheduleWhere.examDate = examDate;
  if (examinationSessionSlotId) {
    scheduleWhere.examinationSessionSlotId = examinationSessionSlotId;
  }

  const subjectWhere = {};
  await applySelectionFilters(selections, scheduleWhere, subjectWhere, options);

  return scoped(model.examScheduleRoomCapacityModel).findAll({
    attributes: [
      "examScheduleRoomCapacityId",
      "examScheduleId",
      "classRoomSectionId",
      "capacity",
    ],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        where: scheduleWhere,
        required: true,
        attributes: [
          "examScheduleId",
          "examDate",
          "examinationSessionSlotId",
          "sessionId",
          "term",
        ],
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
            where:
              Object.keys(subjectWhere).length > 0 ? subjectWhere : undefined,
            required: true,
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
            required: false,
          },
        ],
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ["classRoomSectionId", "roomNumber"],
        required: true,
        where: buildScope(model.classRoomModel),
        include: [
          {
            model: model.examRoomMaterialBundleModel,
            as: "materialBundles",
            required: true,
            where: sequelize.and(
              { status: "RECEIVED" },
              sequelize.where(
                sequelize.col("classRoom.materialBundles.exam_date"),
                "=",
                sequelize.col("examSchedule.exam_date"),
              ),
              sequelize.where(
                sequelize.col(
                  "classRoom.materialBundles.examination_session_slot_id",
                ),
                "=",
                sequelize.col("examSchedule.examination_session_slot_id"),
              ),
            ),
            include: [
              {
                model: model.examRoomMaterialItemModel,
                as: "items",
                required: false,
              },
            ],
          },
        ],
      },
      {
        model: model.studentExamSeatModel,
        as: "seats",
        attributes: ["studentId"],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findRoomCapacitiesForBundleRoom(
  classRoomSectionId,
  examDate,
  examinationSessionSlotId,
  options = {},
) {
  return scoped(model.examScheduleRoomCapacityModel).findAll({
    where: { classRoomSectionId: Number(classRoomSectionId) },
    attributes: [
      "examScheduleRoomCapacityId",
      "examScheduleId",
      "classRoomSectionId",
      "capacity",
    ],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        where: {
          examDate,
          examinationSessionSlotId: Number(examinationSessionSlotId),
        },
        required: true,
        attributes: [
          "examScheduleId",
          "examDate",
          "examinationSessionSlotId",
          "sessionId",
          "term",
        ],
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
    transaction: options.transaction,
  });
}
