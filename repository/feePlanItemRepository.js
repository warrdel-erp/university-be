import { Op, fn, col } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

const BATCH_ATTRS = ['batchId', 'sessionId', 'batch', 'status'];
const SESSION_ATTRS = ['sessionId', 'sessionName', 'courseId'];
const COURSE_ATTRS = [
  'courseId',
  'courseName',
  'courseCode',
  'courseDuration',
  'totalTerms',
  'termType',
];

const FEE_PLAN_ITEM_ATTRS = [
  'feePlanItemId',
  'createDate',
  'dueDate',
  'batchId',
  'year',
  'name',
  'academicPeriod',
  'publishStatus',
  'publishedAt',
  'publishedBy',
  'createdAt',
  'updatedAt',
];

const FEE_PLAN_SUB_ITEM_ATTRS = [
  'feePlanSubitemId',
  'amount',
  'isMainSubItem',
  'feeTypeId',
  'feePlanItemId',
  'createdAt',
  'updatedAt',
];

function sessionCourseInclude(filters = {}) {
  const sessionWhere = { ...buildScope(model.sessionModel) };
  if (filters.sessionId != null) {
    sessionWhere.sessionId = Number(filters.sessionId);
  }

  const courseWhere = { ...buildScope(model.courseModel) };
  if (filters.courseId != null) {
    courseWhere.courseId = Number(filters.courseId);
  }

  return {
    model: model.sessionModel,
    as: 'session',
    attributes: SESSION_ATTRS,
    required: true,
    where: sessionWhere,
    include: [
      {
        model: model.courseModel,
        as: 'course',
        attributes: COURSE_ATTRS,
        required: true,
        where: courseWhere,
      },
    ],
  };
}

function feePlanSubItemsInclude() {
  return {
    model: model.feePlanSubItemsModel,
    as: 'feePlanSubItems',
    attributes: FEE_PLAN_SUB_ITEM_ATTRS,
    required: false,
    where: buildScope(model.feePlanSubItemsModel),
    include: [
      {
        model: model.feeTypeCatalogModel,
        as: 'feeTypeCatalog',
        attributes: ['feeTypeCatalogId', 'name', 'ledgerType'],
        required: false,
      },
    ],
  };
}

function feePlanItemsInclude({ year, withSubItems = false } = {}) {
  const where = { ...buildScope(model.feePlanItemModel) };
  if (year != null) {
    where.year = Number(year);
  }

  const include = [];

  if (withSubItems) {
    include.push(feePlanSubItemsInclude());
  }

  return {
    model: model.feePlanItemModel,
    as: 'feePlanItems',
    attributes: FEE_PLAN_ITEM_ATTRS,
    required: false,
    where,
    include,
  };
}

export async function findFeePlanBatchesOverview(filters = {}) {
  return model.batchModel.findAll({
    where: { status: 'published' },
    attributes: BATCH_ATTRS,
    include: [
      sessionCourseInclude(filters),
      feePlanItemsInclude({ withSubItems: filters.withSubItems === true }),
    ],
    order: [
      [{ model: model.sessionModel, as: 'session' }, 'sessionName', 'ASC'],
      ['batch', 'ASC'],
    ],
  });
}

export async function findBatchWithFeePlanItems(batchId, { year, withSubItems = true } = {}) {
  return model.batchModel.findByPk(Number(batchId), {
    attributes: BATCH_ATTRS,
    include: [
      sessionCourseInclude(),
      feePlanItemsInclude({ year, withSubItems }),
    ],
  });
}

export async function findBatchBasics(batchId, options = {}) {
  return model.batchModel.findByPk(Number(batchId), {
    attributes: BATCH_ATTRS,
    include: [sessionCourseInclude()],
    transaction: options.transaction,
  });
}

export async function findFeePlanItemById(feePlanItemId, options = {}) {
  return scoped(model.feePlanItemModel).findOne({
    attributes: FEE_PLAN_ITEM_ATTRS,
    where: { feePlanItemId: Number(feePlanItemId) },
    include: options.withSubItems ? [feePlanSubItemsInclude()] : [],
    transaction: options.transaction,
  });
}

export async function createFeePlanItem(data, options = {}) {
  return scoped(model.feePlanItemModel).create(data, {
    transaction: options.transaction,
  });
}

export async function updateFeePlanItemById(feePlanItemId, data, options = {}) {
  return scoped(model.feePlanItemModel).update(data, {
    where: { feePlanItemId: Number(feePlanItemId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePlanItemById(feePlanItemId, options = {}) {
  return scoped(model.feePlanItemModel).destroy({
    where: { feePlanItemId: Number(feePlanItemId) },
    transaction: options.transaction,
  });
}

export async function createFeePlanSubItem(data, options = {}) {
  return scoped(model.feePlanSubItemsModel).create(data, {
    transaction: options.transaction,
  });
}

export async function updateFeePlanSubItemById(feePlanSubitemId, data, options = {}) {
  return scoped(model.feePlanSubItemsModel).update(data, {
    where: { feePlanSubitemId: Number(feePlanSubitemId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePlanSubItemById(feePlanSubitemId, options = {}) {
  return scoped(model.feePlanSubItemsModel).destroy({
    where: { feePlanSubitemId: Number(feePlanSubitemId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePlanSubItemsByItemId(feePlanItemId, options = {}) {
  return scoped(model.feePlanSubItemsModel).destroy({
    where: { feePlanItemId: Number(feePlanItemId) },
    transaction: options.transaction,
  });
}

export async function findFeePlanSubItemById(feePlanSubitemId, options = {}) {
  return scoped(model.feePlanSubItemsModel).findOne({
    attributes: FEE_PLAN_SUB_ITEM_ATTRS,
    where: { feePlanSubitemId: Number(feePlanSubitemId) },
    transaction: options.transaction,
  });
}

export async function findFeeTypeCatalogsByIds(feeTypeCatalogIds, options = {}) {
  if (!feeTypeCatalogIds.length) {
    return [];
  }
  return scoped(model.feeTypeCatalogModel).findAll({
    attributes: ['feeTypeCatalogId', 'name', 'ledgerType'],
    where: { feeTypeCatalogId: { [Op.in]: feeTypeCatalogIds } },
    transaction: options.transaction,
  });
}

export async function countStudentsByBatchIds(batchIds) {
  const countMap = new Map();
  if (!batchIds.length) {
    return countMap;
  }

  const rows = await scoped(model.studentModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    attributes: [
      'batchId',
      [fn('COUNT', fn('DISTINCT', col('student_id'))), 'studentCount'],
    ],
    where: { batchId: { [Op.in]: batchIds } },
    group: ['batchId'],
    raw: true,
  });

  for (const row of rows) {
    countMap.set(Number(row.batchId), Number(row.studentCount) || 0);
  }
  return countMap;
}

/** Raised student invoices per fee_plan_item_id. */
export async function countRaisedInvoicesByFeePlanItemIds(feePlanItemIds) {
  const countMap = new Map();
  if (!feePlanItemIds.length) {
    return countMap;
  }

  const rows = await scoped(model.studentFeeInvoiceModel).findAll({
    attributes: [
      'feePlanItemId',
      [fn('COUNT', col('student_fee_invoice_id')), 'raisedCount'],
    ],
    where: {
      feePlanItemId: { [Op.in]: feePlanItemIds },
      status: 'generated',
    },
    group: ['feePlanItemId'],
    raw: true,
  });

  for (const row of rows) {
    countMap.set(Number(row.feePlanItemId), Number(row.raisedCount) || 0);
  }
  return countMap;
}

export async function findFeePlanItemsByBatchAndYear(batchId, year, options = {}) {
  return scoped(model.feePlanItemModel).findAll({
    attributes: FEE_PLAN_ITEM_ATTRS,
    where: {
      batchId: Number(batchId),
      year: Number(year),
    },
    include: options.withSubItems ? [feePlanSubItemsInclude()] : [],
    order: [['feePlanItemId', 'ASC']],
    transaction: options.transaction,
  });
}

export async function updateFeePlanItemsPublishByIds(feePlanItemIds, data, options = {}) {
  if (!feePlanItemIds.length) {
    return [0];
  }
  return scoped(model.feePlanItemModel).update(data, {
    where: { feePlanItemId: { [Op.in]: feePlanItemIds } },
    transaction: options.transaction,
  });
}

export async function createFeePlanPublishHistory(data, options = {}) {
  return scoped(model.feePlanPublishHistoryModel).create(data, {
    transaction: options.transaction,
  });
}

export async function findFeePlanPublishHistory(filters = {}, options = {}) {
  const where = {};
  if (filters.batchId != null) {
    where.batchId = Number(filters.batchId);
  }
  if (filters.year != null) {
    where.year = Number(filters.year);
  }

  return scoped(model.feePlanPublishHistoryModel).findAll({
    attributes: [
      'feePlanPublishHistoryId',
      'batchId',
      'year',
      'action',
      'publishedAt',
      'publishedBy',
    ],
    where,
    order: [['publishedAt', 'DESC'], ['feePlanPublishHistoryId', 'DESC']],
    transaction: options.transaction,
  });
}

export async function findFeePlanPublishHistoryById(feePlanPublishHistoryId, options = {}) {
  return scoped(model.feePlanPublishHistoryModel).findOne({
    attributes: [
      'feePlanPublishHistoryId',
      'batchId',
      'year',
      'action',
      'publishedAt',
      'publishedBy',
    ],
    where: { feePlanPublishHistoryId: Number(feePlanPublishHistoryId) },
    transaction: options.transaction,
  });
}

export async function countRaisedInvoicesForFeePlanItemIds(feePlanItemIds, options = {}) {
  if (!feePlanItemIds.length) {
    return 0;
  }
  return scoped(model.studentFeeInvoiceModel).count({
    where: {
      feePlanItemId: { [Op.in]: feePlanItemIds },
      status: 'generated',
    },
    transaction: options.transaction,
  });
}

export async function findStudentsByBatchId(batchId, options = {}) {
  return scoped(model.studentModel, { scopeConfig: { academicYear: false } }).findAll({
    attributes: [
      'studentId',
      'firstName',
      'middleName',
      'lastName',
      'scholarNumber',
      'enrollNumber',
      'batchId',
    ],
    where: { batchId: Number(batchId) },
    order: [['firstName', 'ASC'], ['studentId', 'ASC']],
    transaction: options.transaction,
  });
}

export async function findRaisedInvoicesByFeePlanItemId(feePlanItemId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findAll({
    attributes: ['studentFeeInvoiceId', 'studentId', 'total', 'status'],
    where: {
      feePlanItemId: Number(feePlanItemId),
      status: 'generated',
    },
    transaction: options.transaction,
  });
}
