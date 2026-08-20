import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

function excludeTimestamps() {
  return ["createdAt", "updatedAt"];
}

function feePlanProfileInclude() {
  return {
    model: model.feePlanProfileModel,
    as: "feePlanProfile",
    required: false,
    attributes: ["feePlanProfileId", "name", "planType", "category", "courseSessionId"],
    include: [
      {
        model: model.sessionCouseMappingModel,
        as: "courseSessionMapping",
        required: false,
        attributes: ["sessionCourseMappingId", "courseId", "sessionId", "instituteId"],
        include: [
          {
            model: model.courseModel,
            as: "courses",
            required: false,
            attributes: ["courseId", "courseName"],
          },
          {
            model: model.sessionModel,
            as: "session",
            required: false,
            attributes: ["sessionId", "sessionName"],
          },
        ],
      },
    ],
  };
}

function feeInvoiceItemsInclude() {
  return {
    model: model.studentFeeInvoiceItemsModel,
    as: "feeInvoiceItems",
    required: false,
    attributes: { exclude: excludeTimestamps() },
    include: [
      {
        model: model.feeTypeCatalogModel,
        as: "feeTypeCatalog",
        attributes: ["feeTypeCatalogId", "name", "ledgerType", "description", "amount"],
      },
    ],
  };
}

function feePlanItemInclude() {
  return {
    model: model.feePlanItemModel,
    as: "feePlanItem",
    attributes: { exclude: excludeTimestamps() },
    include: [
      {
        model: model.feePlanSubItemsModel,
        as: "feePlanSubItems",
        required: false,
        attributes: { exclude: excludeTimestamps() },
      },
    ],
  };
}

function feePlanItemDetailInclude() {
  return {
    model: model.feePlanItemModel,
    as: "feePlanItem",
    required: false,
    attributes: { exclude: excludeTimestamps() },
    include: [
      feePlanProfileInclude(),
      {
        model: model.feePlanSubItemsModel,
        as: "feePlanSubItems",
        required: false,
        attributes: { exclude: excludeTimestamps() },
      },
    ],
  };
}

function studentInclude() {
  return {
    model: model.studentModel,
    as: "studentFeeInvoiceStudent",
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "email",
      "mobileNumber",
      "enrollNumber",
      "feePlanProfileId",
      "courseId",
      "sessionId",
    ],
  };
}

function studentDetailInclude() {
  return {
    model: model.studentModel,
    as: "studentFeeInvoiceStudent",
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "email",
      "mobileNumber",
      "enrollNumber",
      "feePlanProfileId",
      "courseId",
      "sessionId",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        required: false,
        attributes: ["courseId", "courseName"],
      },
      {
        model: model.sessionModel,
        as: "studentSession",
        required: false,
        attributes: ["sessionId", "sessionName"],
      },
      {
        ...feePlanProfileInclude(),
        as: "studentFeePlanProfile",
      },
    ],
  };
}

function instituteInclude() {
  return {
    model: model.instituteModel,
    as: "instituteStudentFeeInvoice",
    required: false,
    attributes: ["instituteId", "instituteName", "instituteCode"],
  };
}

export async function findFeePlanItemById(feePlanItemId, options = {}) {
  return scoped(model.feePlanItemModel).findOne({
    where: { feePlanItemId },
    transaction: options.transaction,
  });
}

export async function findStudentById(studentId, options = {}) {
  return scoped(model.studentModel).findOne({
    where: { studentId },
    attributes: options.attributes ?? ["studentId", "instituteId", "feePlanProfileId"],
    transaction: options.transaction,
  });
}

export async function findFeePlanSubItemsByFeePlanItemId(feePlanItemId, options = {}) {
  const where = { feePlanItemId };
  if (options.supplementalOnly) {
    where.isMainSubItem = false;
  }
  return scoped(model.feePlanSubItemsModel).findAll({
    where,
    order: [["feePlanSubitemId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findStudentFeeInvoiceByStudentAndItem(studentId, feePlanItemId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findOne({
    where: { studentId, feePlanItemId },
    transaction: options.transaction,
  });
}

export async function createStudentFeeInvoice(data, options = {}) {
  return scoped(model.studentFeeInvoiceModel).create(data, { transaction: options.transaction });
}

export async function bulkCreateStudentFeeInvoiceItems(rows, options = {}) {
  return model.studentFeeInvoiceItemsModel.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

export async function findStudentFeeInvoiceById(studentFeeInvoiceId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findOne({
    where: { studentFeeInvoiceId },
    include: [
      instituteInclude(),
      studentDetailInclude(),
      feePlanItemDetailInclude(),
      feeInvoiceItemsInclude(),
    ],
    transaction: options.transaction,
  });
}

export async function findStudentFeeInvoicesByStudentId(studentId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findAll({
    where: { studentId },
    include: [feePlanItemInclude(), feeInvoiceItemsInclude()],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction: options.transaction,
  });
}

function resolvePagination(pagination = {}) {
  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(pagination.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

async function findStudentIdsMatchingInvoiceSearch(search, options = {}) {
  const term = search?.trim();
  if (!term) return [];
  const pattern = { [Op.like]: `%${term}%` };

  const orConditions = [
    { firstName: pattern },
    { middleName: pattern },
    { lastName: pattern },
    { scholarNumber: pattern },
    { enrollNumber: pattern },
    { email: pattern },
    { mobileNumber: pattern },
  ];

  const tokens = term.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    orConditions.push({
      [Op.and]: tokens.map((token) => ({
        [Op.or]: [
          { firstName: { [Op.like]: `%${token}%` } },
          { middleName: { [Op.like]: `%${token}%` } },
          { lastName: { [Op.like]: `%${token}%` } },
          { scholarNumber: { [Op.like]: `%${token}%` } },
          { enrollNumber: { [Op.like]: `%${token}%` } },
        ],
      })),
    });
  }

  const rows = await scoped(model.studentModel).findAll({
    where: { [Op.or]: orConditions },
    attributes: ["studentId"],
    raw: true,
    transaction: options.transaction,
  });

  return rows.map((r) => r.studentId);
}

function buildInvoiceWhere({ paymentStatuses, search, matchingStudentIds = [] }) {
  const andParts = [{ status: "generated" }];

  if (paymentStatuses?.length) {
    andParts.push({ paymentStatus: { [Op.in]: paymentStatuses } });
  }

  const term = search?.trim();
  if (term) {
    const orConditions = [];

    if (matchingStudentIds.length) {
      orConditions.push({
        studentId: { [Op.in]: matchingStudentIds },
      });
    }

    const numericId = Number(term);
    if (!Number.isNaN(numericId) && Number.isInteger(numericId)) {
      orConditions.push(
        { studentFeeInvoiceId: numericId },
        { studentId: numericId }
      );
    }

    if (orConditions.length === 0) {
      orConditions.push({ studentFeeInvoiceId: -1 });
    }

    andParts.push({ [Op.or]: orConditions });
  }

  return andParts.length === 1 ? andParts[0] : { [Op.and]: andParts };
}

export async function findAllStudentFeeInvoicesByInstitute({
  paymentStatuses,
  search,
  page,
  limit,
  transaction,
} = {}) {
  const { page: resolvedPage, limit: resolvedLimit, offset } = resolvePagination({ page, limit });

  const matchingStudentIds = search
    ? await findStudentIdsMatchingInvoiceSearch(search, { transaction })
    : [];

  const where = buildInvoiceWhere({ paymentStatuses, search, matchingStudentIds });

  const { count, rows } = await scoped(model.studentFeeInvoiceModel).findAndCountAll({
    where,
    attributes: [
      "studentFeeInvoiceId",
      "studentId",
      "feePlanItemId",
      "instituteId",
      "total",
      "createDate",
      "dueDate",
      "status",
      "paymentStatus",
      "paidAmount",
    ],
    include: [
      {
        model: model.studentModel,
        as: "studentFeeInvoiceStudent",
        attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber"],
        required: true,
      },
      feePlanItemInclude(),
    ],
    order: [["studentFeeInvoiceId", "DESC"]],
    limit: resolvedLimit,
    offset,
    distinct: true,
    transaction,
  });

  return {
    rows,
    total: count,
    page: resolvedPage,
    limit: resolvedLimit,
  };
}
