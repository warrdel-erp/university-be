import { Op } from "sequelize";
import * as model from "../models/index.js";

const issueIncludes = [
  {
    model: model.assetIssueItemModel,
    as: "items",
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    include: [
      {
        model: model.assetModel,
        as: "asset",
        attributes: ["assetId", "name", "code", "status", "condition"],
      },
    ],
  },
];

export async function createAssetIssue(payload, options = {}) {
  return model.assetIssueModel.create(payload, { transaction: options.transaction });
}

export async function createAssetIssueItems(payload, options = {}) {
  return model.assetIssueItemModel.bulkCreate(payload, { transaction: options.transaction });
}

export async function updateAssetIssue(assetIssueId, instituteId, payload, options = {}) {
  const [affected] = await model.assetIssueModel.update(payload, {
    where: { assetIssueId, instituteId },
    transaction: options.transaction,
  });
  return affected;
}

export async function findAssetIssueById(assetIssueId, instituteId, options = {}) {
  return model.assetIssueModel.findOne({
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    where: { assetIssueId, instituteId },
    include: issueIncludes,
    transaction: options.transaction,
  });
}

export async function findIssueItemsByIds(assetIssueId, assetIssueItemIds, options = {}) {
  return model.assetIssueItemModel.findAll({
    attributes: ["assetIssueItemId", "assetIssueId", "assetId"],
    where: { assetIssueId, assetIssueItemId: assetIssueItemIds },
    transaction: options.transaction,
  });
}

export async function updateAssetIssueItemById(assetIssueItemId, assetIssueId, payload, options = {}) {
  const [affected] = await model.assetIssueItemModel.update(payload, {
    where: { assetIssueItemId, assetIssueId },
    transaction: options.transaction,
  });
  return affected;
}

function buildAssetIssueWhere(instituteId, filters = {}) {
  const where = { instituteId };
  const search = filters.search?.trim();
  if (!search) {
    return where;
  }

  const pattern = { [Op.like]: `%${search}%` };
  const orParts = [
    { memberType: pattern },
    { remarks: pattern },
    { "$items.remarks$": pattern },
    { "$items.asset.name$": pattern },
    { "$items.asset.code$": pattern },
  ];

  const numericSearch = Number(search);
  if (search !== "" && !Number.isNaN(numericSearch)) {
    orParts.push({ assetIssueId: numericSearch }, { memberId: numericSearch });
  }

  return {
    [Op.and]: [{ instituteId }, { [Op.or]: orParts }],
  };
}

export async function findAssetIssuesPaginated(instituteId, filters = {}, pagination = {}, options = {}) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;
  const where = buildAssetIssueWhere(instituteId, filters);

  const { count, rows } = await model.assetIssueModel.findAndCountAll({
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    where,
    include: issueIncludes,
    order: [["assetIssueId", "DESC"]],
    limit,
    offset,
    subQuery: false,
    distinct: true,
    col: "asset_issue_id",
    transaction: options.transaction,
  });

  return { rows, total: count, page, limit };
}

export async function findStudentById(studentId, instituteId, options = {}) {
  return model.studentModel.findOne({
    attributes: ["studentId"],
    where: { studentId, instituteId },
    transaction: options.transaction,
  });
}

export async function findStudentMemberDetailsById(studentId, instituteId, options = {}) {
  return model.studentModel.findOne({
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
    where: { studentId, instituteId },
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findTeacherById(employeeId, instituteId, options = {}) {
  return model.employeeModel.findOne({
    attributes: ["employeeId"],
    where: { employeeId, instituteId },
    transaction: options.transaction,
  });
}

export async function findEmployeeMemberDetailsById(employeeId, instituteId, options = {}) {
  return model.employeeModel.findOne({
    attributes: ["employeeId", "employeeName", "employeeCode", "department"],
    where: { employeeId, instituteId },
    transaction: options.transaction,
  });
}

export async function findStudentMemberDetailsByIds(studentIds, instituteId, options = {}) {
  if (!studentIds.length) return [];
  return model.studentModel.findAll({
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
    where: { studentId: studentIds, instituteId },
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findEmployeeMemberDetailsByIds(employeeIds, instituteId, options = {}) {
  if (!employeeIds.length) return [];
  return model.employeeModel.findAll({
    attributes: ["employeeId", "employeeName", "employeeCode", "department"],
    where: { employeeId: employeeIds, instituteId },
    transaction: options.transaction,
  });
}

export async function findInstituteAssetsByIds(assetIds, instituteId, options = {}) {
  return model.assetModel.findAll({
    attributes: ["assetId"],
    where: { assetId: assetIds, instituteId },
    transaction: options.transaction,
  });
}

export async function updateAssetStatusByIds(assetIds, instituteId, status, options = {}) {
  const [affected] = await model.assetModel.update(
    { status },
    {
      where: { assetId: assetIds, instituteId },
      transaction: options.transaction,
    }
  );
  return affected;
}
