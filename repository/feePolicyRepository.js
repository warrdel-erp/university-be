import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function feePolicyIncludes() {
  return [
    {
      model: model.feePolicyComponentsModel,
      as: "policyComponents",
      required: false,
      attributes: ["feePolicyComponentId", "feePolicyId", "feeTypeCatalogId"],
      include: [
        {
          model: model.feeTypeCatalogModel,
          as: "feeTypeCatalog",
          attributes: ["feeTypeCatalogId", "name", "amount", "ledgerType", "refundable"],
          required: false,
        },
      ],
    },
    {
      model: model.feePolicyBatchesModel,
      as: "policyBatches",
      required: false,
      attributes: ["feePolicyBatchId", "feePolicyId", "courseId", "batchId", "year", "term"],
      include: [
        {
          model: model.courseModel,
          as: "course",
          attributes: ["courseId", "courseName", "courseCode"],
          required: false,
        },
        {
          model: model.batchModel,
          as: "batch",
          attributes: ["batchId", "batch", "sessionId", "status"],
          required: false,
        },
      ],
    },
    {
      model: model.feePolicySlabsModel,
      as: "policySlabs",
      required: false,
      attributes: [
        "feePolicySlabId",
        "feePolicyId",
        "relativePeriod",
        "fromUnit",
        "toUnit",
        "slabValue",
        "orderIndex",
      ],
    },
    {
      model: model.feePolicyStudentsModel,
      as: "policyStudents",
      required: false,
      attributes: ["feePolicyStudentId", "feePolicyId", "studentId", "instituteId", "universityId"],
      include: [
        {
          model: model.studentModel,
          as: "student",
          attributes: [
            "studentId",
            "userId",
            "enrollNumber",
            "admissionNumber",
            "scholarNumber",
            "firstName",
            "middleName",
            "lastName",
            "batchId",
          ],
          required: false,
        },
      ],
    },
  ];
}

export async function createFeePolicy(data, options = {}) {
  return scoped(model.feePolicyModel).create(data, { transaction: options.transaction });
}

export async function bulkCreateFeePolicyComponents(rows, options = {}) {
  if (!rows || !rows.length) return [];
  return model.feePolicyComponentsModel.bulkCreate(rows, { transaction: options.transaction });
}

export async function bulkCreateFeePolicyBatches(rows, options = {}) {
  if (!rows || !rows.length) return [];
  return model.feePolicyBatchesModel.bulkCreate(rows, { transaction: options.transaction });
}

export async function bulkCreateFeePolicySlabs(rows, options = {}) {
  if (!rows || !rows.length) return [];
  return model.feePolicySlabsModel.bulkCreate(rows, { transaction: options.transaction });
}

export async function findFeePolicyById(feePolicyId, options = {}) {
  return scoped(model.feePolicyModel).findOne({
    where: { feePolicyId: Number(feePolicyId) },
    include: feePolicyIncludes(),
    order: [[{ model: model.feePolicySlabsModel, as: "policySlabs" }, "orderIndex", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findFeePolicies({
  publishStatus,
  effect,
  calculationType,
  courseId,
  batchId,
  year,
  term,
  studentId,
  search,
  page,
  limit,
} = {}, options = {}) {
  const where = {};

  if (publishStatus && publishStatus !== "all") {
    where.publishStatus = publishStatus;
  }

  if (effect) {
    where.effect = effect;
  }

  if (calculationType) {
    where.calculationType = calculationType;
  }

  if (search && search.trim()) {
    where[Op.or] = [
      { policyName: { [Op.like]: `%${search.trim}%` } },
      { description: { [Op.like]: `%${search.trim}%` } },
    ];
  }

  const include = feePolicyIncludes();

  if (batchId || year || courseId || term) {
    const batchInclude = include.find((inc) => inc.as === "policyBatches");
    if (batchInclude) {
      batchInclude.where = {};
      if (courseId) batchInclude.where.courseId = Number(courseId);
      if (batchId) batchInclude.where.batchId = Number(batchId);
      if (year) batchInclude.where.year = Number(year);
      if (term) batchInclude.where.term = Number(term);
      batchInclude.required = true;
    }
  }

  if (studentId) {
    const studentInclude = include.find((inc) => inc.as === "policyStudents");
    if (studentInclude) {
      studentInclude.where = { studentId: Number(studentId) };
      studentInclude.required = true;
    }
  }

  const queryOptions = {
    where,
    include,
    order: [["feePolicyId", "DESC"]],
    distinct: true,
    transaction: options.transaction,
  };

  const isPaginated = page != null || limit != null;
  if (isPaginated) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    queryOptions.limit = limitNum;
    queryOptions.offset = (pageNum - 1) * limitNum;
  }

  const { count: totalRecords, rows } = await scoped(model.feePolicyModel).findAndCountAll(queryOptions);

  const limitNum = isPaginated ? Math.max(1, Number(limit) || 10) : totalRecords;
  const pageNum = isPaginated ? Math.max(1, Number(page) || 1) : 1;

  return {
    totalRecords,
    totalPages: isPaginated ? Math.ceil(totalRecords / limitNum) || 1 : 1,
    currentPage: pageNum,
    pageSize: limitNum,
    isPaginated,
    rows,
  };
}

export async function updateFeePolicy(feePolicyId, data, options = {}) {
  return scoped(model.feePolicyModel).update(data, {
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePolicyComponents(feePolicyId, options = {}) {
  return model.feePolicyComponentsModel.destroy({
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePolicyBatches(feePolicyId, options = {}) {
  return model.feePolicyBatchesModel.destroy({
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePolicySlabs(feePolicyId, options = {}) {
  return model.feePolicySlabsModel.destroy({
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePolicy(feePolicyId, options = {}) {
  return scoped(model.feePolicyModel).destroy({
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function bulkCreateFeePolicyStudents(rows, options = {}) {
  if (!rows || !rows.length) return [];
  return model.feePolicyStudentsModel.bulkCreate(rows, {
    ignoreDuplicates: true,
    transaction: options.transaction,
  });
}

export async function findFeePolicyStudents({ feePolicyId, studentId, instituteId, universityId } = {}, options = {}) {
  const where = {};
  if (feePolicyId) where.feePolicyId = Number(feePolicyId);
  if (studentId) where.studentId = Number(studentId);
  if (instituteId) where.instituteId = Number(instituteId);
  if (universityId) where.universityId = Number(universityId);

  return model.feePolicyStudentsModel.findAll({
    where,
    include: [
      {
        model: model.feePolicyModel,
        as: "policy",
        required: false,
      },
      {
        model: model.studentModel,
        as: "student",
        attributes: [
          "studentId",
          "userId",
          "enrollNumber",
          "admissionNumber",
          "scholarNumber",
          "firstName",
          "middleName",
          "lastName",
          "batchId",
          "instituteId",
          "universityId",
        ],
        required: false,
      },
    ],
    order: [["feePolicyStudentId", "DESC"]],
    transaction: options.transaction,
  });
}

export async function deleteFeePolicyStudents({ feePolicyId, studentId } = {}, options = {}) {
  const where = {};
  if (feePolicyId) where.feePolicyId = Number(feePolicyId);
  if (studentId) where.studentId = Number(studentId);
  if (!Object.keys(where).length) return 0;

  return model.feePolicyStudentsModel.destroy({
    where,
    transaction: options.transaction,
  });
}

export async function findStudentsByIds(studentIds, options = {}) {
  if (!studentIds || !studentIds.length) return [];
  return model.studentModel.findAll({
    where: {
      studentId: { [Op.in]: studentIds.map(Number) },
    },
    attributes: [
      "studentId",
      "userId",
      "instituteId",
      "universityId",
      "firstName",
      "lastName",
      "enrollNumber",
      "scholarNumber",
      "admissionNumber",
      "batchId",
    ],
    transaction: options.transaction,
  });
}

export async function findPoliciesByIds(feePolicyIds, options = {}) {
  if (!feePolicyIds || !feePolicyIds.length) return [];
  return model.feePolicyModel.findAll({
    where: {
      feePolicyId: { [Op.in]: feePolicyIds.map(Number) },
    },
    transaction: options.transaction,
  });
}

export async function findStudentFeeDetailsWithIncludes(studentId, options = {}) {
  return scoped(model.studentModel, {
    scopeConfig: { academicYear: false },
  }).findOne({
    where: { studentId: Number(studentId) },
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "enrollNumber",
      "admissionNumber",
      "batchId",
      "courseId",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode", "courseDuration"],
        required: false,
      },
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch"],
        required: false,
        include: [
          {
            model: model.feePolicyBatchesModel,
            as: "feePolicyBatches",
            required: false,
            include: [
              {
                model: model.feePolicyModel,
                as: "policy",
                required: false,
                where: { publishStatus: "published", isActive: true },
                include: [
                  {
                    model: model.feePolicyComponentsModel,
                    as: "policyComponents",
                    required: false,
                    include: [
                      {
                        model: model.feeTypeCatalogModel,
                        as: "feeTypeCatalog",
                        required: false,
                        attributes: ["feeTypeCatalogId", "name", "refundable"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: model.feePolicyStudentsModel,
        as: "feePolicyStudents",
        required: false,
        include: [
          {
            model: model.feePolicyModel,
            as: "policy",
            required: false,
            where: { publishStatus: "published", isActive: true },
            include: [
              {
                model: model.feePolicyComponentsModel,
                as: "policyComponents",
                required: false,
                include: [
                  {
                    model: model.feeTypeCatalogModel,
                    as: "feeTypeCatalog",
                    required: false,
                    attributes: ["feeTypeCatalogId", "name", "refundable"],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: model.studentFeeInvoiceModel,
        as: "studentFeeInvoices",
        required: false,
        attributes: [
          "studentFeeInvoiceId",
          "createDate",
          "dueDate",
          "total",
          "status",
          "paymentStatus",
          "paidAmount",
          "studentId",
          "feePlanItemId",
          "billingScheduleItemId",
        ],
        include: [
          {
            model: model.feePlanItemModel,
            as: "feePlanItem",
            required: false,
            attributes: ["feePlanItemId", "year", "name"],
          },
          {
            model: model.studentFeeInvoiceItemsModel,
            as: "feeInvoiceItems",
            required: false,
            attributes: ["studentFeeInvoiceItemsId", "feeTypeId", "amount", "waiver", "isMainItem"],
            include: [
              {
                model: model.feeTypeCatalogModel,
                as: "feeTypeCatalog",
                required: false,
                attributes: ["feeTypeCatalogId", "name", "ledgerType", "refundable"],
              },
            ],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findFeePoliciesByStudentId(studentId, { year } = {}, options = {}) {
  const student = await scoped(model.studentModel, {
    scopeConfig: { academicYear: false },
  }).findOne({
    where: { studentId: Number(studentId) },
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "enrollNumber",
      "admissionNumber",
      "batchId",
      "courseId",
      "classSectionTermId",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch"],
        required: false,
      },
      {
        model: model.classSectionTermModel,
        as: "studentClassSectionTerm",
        attributes: ["classSectionTermId", "term", "classSectionsId"],
        required: false,
        include: [
          {
            model: model.classSectionModel,
            as: "classSection",
            attributes: ["classSectionsId", "year"],
            required: false,
          },
        ],
      },
    ],
    transaction: options.transaction,
  });

  if (!student) return null;

  // Resolve student's year: explicitly passed query year > classSection year > latest invoice year
  let resolvedYear =
    year != null && year !== ""
      ? Number(year)
      : student.studentClassSectionTerm?.classSection?.year != null
      ? Number(student.studentClassSectionTerm.classSection.year)
      : null;

  if (resolvedYear == null) {
    const latestInvoice = await scoped(model.studentFeeInvoiceModel, {
      scopeConfig: { academicYear: false },
    }).findOne({
      where: { studentId: Number(studentId) },
      include: [
        {
          model: model.feePlanItemModel,
          as: "feePlanItem",
          attributes: ["year"],
          required: true,
        },
      ],
      attributes: ["studentFeeInvoiceId", "feePlanItemId"],
      order: [["createDate", "DESC"]],
      transaction: options.transaction,
    });
    if (latestInvoice?.feePlanItem?.year != null) {
      resolvedYear = Number(latestInvoice.feePlanItem.year);
    }
  }

  const batchConditions = [];
  if (student.batchId) batchConditions.push({ batchId: Number(student.batchId) });
  if (student.courseId) batchConditions.push({ courseId: Number(student.courseId), batchId: null });

  const policyBatchesWhere = {};
  if (batchConditions.length > 0) {
    policyBatchesWhere[Op.or] = batchConditions;
  }
  // Scope feePolicyBatches year-wise: matches if year is null (all years) or matches the student's year
  if (resolvedYear != null) {
    policyBatchesWhere.year = {
      [Op.or]: [null, resolvedYear],
    };
  }

  const [studentPolicyRows, batchPolicyRows] = await Promise.all([
    scoped(model.feePolicyStudentsModel).findAll({
      where: { studentId: Number(studentId) },
      include: [
        {
          model: model.feePolicyModel,
          as: "policy",
          required: true,
          attributes: ["feePolicyId", "policyName", "publishStatus", "effect"],
        },
      ],
      transaction: options.transaction,
    }),
    batchConditions.length > 0
      ? scoped(model.feePolicyModel).findAll({
          include: [
            {
              model: model.feePolicyBatchesModel,
              as: "policyBatches",
              where: policyBatchesWhere,
              required: true,
              attributes: ["feePolicyBatchId", "feePolicyId", "courseId", "batchId", "year", "term"],
            },
          ],
          attributes: ["feePolicyId", "policyName", "publishStatus", "effect"],
          transaction: options.transaction,
        })
      : [],
  ]);

  return { student, studentPolicyRows, batchPolicyRows, resolvedYear };
}

export async function findFeePoliciesOptions({
  publishStatus,
  effect,
  calculationType,
  courseId,
  batchId,
  year,
  search,
} = {}, options = {}) {
  const where = {};

  if (publishStatus && publishStatus !== "all") {
    where.publishStatus = publishStatus;
  }
  if (effect) {
    where.effect = effect;
  }
  if (calculationType) {
    where.calculationType = calculationType;
  }
  if (search && search.trim()) {
    where.policyName = { [Op.like]: `%${search.trim()}%` };
  }

  const include = [];

  // If courseId, batchId, or year is passed, check scope in feePolicyBatchesModel
  if (courseId || batchId || (year != null && year !== "")) {
    const batchWhere = {};
    if (courseId && batchId) {
      batchWhere[Op.or] = [
        { batchId: Number(batchId) },
        { courseId: Number(courseId), batchId: null },
      ];
    } else if (batchId) {
      batchWhere.batchId = Number(batchId);
    } else if (courseId) {
      batchWhere.courseId = Number(courseId);
    }

    if (year != null && year !== "") {
      batchWhere.year = {
        [Op.or]: [null, Number(year)],
      };
    }

    include.push({
      model: model.feePolicyBatchesModel,
      as: "policyBatches",
      where: batchWhere,
      required: true,
      attributes: ["feePolicyBatchId", "feePolicyId", "courseId", "batchId", "year", "term"],
    });
  }

  return scoped(model.feePolicyModel).findAll({
    where,
    attributes: [
      "feePolicyId",
      "policyName",
      "effect",
      "publishStatus",
    ],
    include,
    order: [["policyName", "ASC"]],
    transaction: options.transaction,
  });
}

