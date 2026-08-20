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
  if (examinationSessionSlotId)
    scheduleWhere.examinationSessionSlotId = examinationSessionSlotId;
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
            required: Object.keys(subjectWhere).length > 0,
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
        attributes: ["classRoomSectionId", "roomNumber"],
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
      {
        model: model.studentExamSeatModel,
        as: "seats",
        attributes: ["studentId"],
        required: false,
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

export async function getBundleById(examRoomMaterialBundleId) {
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

export async function createBundle(bundleData, itemsData, transaction) {
  const bundle = await scoped(model.examRoomMaterialBundleModel).create(
    bundleData,
    { transaction },
  );

  const items = itemsData.map((item) => ({
    ...item,
    examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
    createdBy: bundleData.createdBy,
    updatedBy: bundleData.updatedBy,
  }));

  const createdItems = await model.examRoomMaterialItemModel.bulkCreate(items, {
    transaction,
  });

  return {
    ...bundle.get({ plain: true }),
    items: createdItems.map((i) => i.get({ plain: true })),
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

export async function getBundleItemsByBundleId(examRoomMaterialBundleId) {
  return model.examRoomMaterialItemModel.findAll({
    where: { examRoomMaterialBundleId },
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
