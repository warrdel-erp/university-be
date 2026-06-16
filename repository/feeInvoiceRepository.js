import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import { requestContext } from "../utility/requestContext.js";

function feeInvoiceExcludedAttributes() {
  return [
    "createdAt",
    "updatedAt",
    "deletedAt",
    "createdBy",
    "updatedBy",
    "class_student_mapper_id",
    "fee_group_id",
  ];
}

function feePlanExcludedAttributes() {
  return ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "fee_group_id"];
}

function userFeeInvoiceInclude() {
  return {
    model: model.userModel.unscoped(),
    as: "userFeeInvoice",
    attributes: ["universityId", "userId"],
    where: buildScope(model.userModel),
    required: true,
  };
}

function feePlanInclude() {
  return {
    model: model.feePlanModel.unscoped(),
    as: "feeInvoicePlan",
    attributes: { exclude: feePlanExcludedAttributes() },
    where: buildScope(model.feePlanModel),
    required: false,
  };
}

function classStudentMapperInclude(businessWhere = {}) {
  return {
    model: model.classStudentMapperModel.unscoped(),
    as: "feeStudentMapper",
    attributes: {
      exclude: [
        "createdAt",
        "updatedAt",
        "deletedAt",
        "createdBy",
        "updatedBy",
        "student_id",
        "class_sections_id",
      ],
    },
    where: { ...businessWhere, ...buildScope(model.classStudentMapperModel) },
    include: [
      {
        model: model.studentModel.unscoped(),
        as: "studentMapped",
        attributes: ["firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
        where: buildScope(model.studentModel),
        required: true,
      },
      {
        model: model.classSectionModel.unscoped(),
        as: "studentSectionDetail",
        attributes: ["section", "classSectionsId", "class"],
      },
    ],
  };
}

function feeInvoiceDetailsInclude() {
  return {
    model: model.feeInvoiceDetailModel.unscoped(),
    as: "feeInvoiceDetails",
    attributes: ["feeInvoiceDetailsId", "feeInvoiceId", "amount", "waiver", "subTotal", "paidAmount"],
    include: [
      {
        model: model.feePlanTypeModel.unscoped(),
        as: "feeInvoiceTypePlan",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      },
      {
        model: model.feePlanSemesterModel.unscoped(),
        as: "feeInvoiceTypeSemester",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      },
    ],
  };
}

function feeInvoiceListIncludes(filters = {}) {
  const mapperWhere = filters.acedmicYearId ? { acedmicYearId: filters.acedmicYearId } : {};

  return [
    userFeeInvoiceInclude(),
    feePlanInclude(),
    classStudentMapperInclude(mapperWhere),
    feeInvoiceDetailsInclude(),
  ];
}

async function assertScopedClassStudentMapper(classStudentMapperId, transaction) {
  return model.classStudentMapperModel.unscoped().findOne({
    attributes: ["classStudentMapperId", "studentId"],
    where: { classStudentMapperId },
    include: [
      {
        model: model.studentModel.unscoped(),
        as: "studentMapped",
        attributes: [],
        where: buildScope(model.studentModel),
        required: true,
      },
    ],
    transaction,
  });
}

async function assertScopedFeeInvoice(feeInvoiceId, transaction) {
  return model.feeInvoiceModel.unscoped().findOne({
    attributes: ["feeInvoiceId"],
    where: { feeInvoiceId },
    include: [userFeeInvoiceInclude()],
    transaction,
  });
}

export async function addFeeInvoice(feeInvoiceData, transaction) {
  try {
    const feePlan = await scoped(model.feePlanModel).findOne({
      attributes: ["feePlanId"],
      where: { feePlanId: feeInvoiceData.feePlanId },
      transaction,
    });
    if (!feePlan) {
      throw new Error("Fee plan not found");
    }

    const mapper = await assertScopedClassStudentMapper(
      feeInvoiceData.classStudentMapperId,
      transaction
    );
    if (!mapper) {
      throw new Error("Class student mapper not found");
    }

    return model.feeInvoiceModel.unscoped().create(feeInvoiceData, { transaction });
  } catch (error) {
    console.error("Error in add Fee Invoice :", error);
    throw error;
  }
}

export async function getFeeInvoiceDetails(filters = {}) {
  try {
    return model.feeInvoiceModel.unscoped().findAll({
      attributes: { exclude: feeInvoiceExcludedAttributes() },
      include: feeInvoiceListIncludes(filters),
    });
  } catch (error) {
    console.error("Error fetching FeeInvoice details:", error);
    throw error;
  }
}

export async function getSingleFeeInvoiceDetails(feeInvoiceId) {
  try {
    return model.feeInvoiceModel.unscoped().findOne({
      attributes: { exclude: feeInvoiceExcludedAttributes() },
      where: { feeInvoiceId },
      include: [
        userFeeInvoiceInclude(),
        {
          model: model.feePlanModel.unscoped(),
          as: "feeInvoicePlan",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        },
        {
          model: model.classStudentMapperModel.unscoped(),
          as: "feeStudentMapper",
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "deletedAt",
              "createdBy",
              "updatedBy",
              "student_id",
              "class_sections_id",
            ],
          },
          where: buildScope(model.classStudentMapperModel),
          include: [
            {
              model: model.studentModel.unscoped(),
              as: "studentMapped",
              attributes: ["firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
              where: buildScope(model.studentModel),
              required: true,
            },
            {
              model: model.classSectionModel.unscoped(),
              as: "studentSectionDetail",
              attributes: ["section", "classSectionsId", "class"],
            },
          ],
        },
        feeInvoiceDetailsInclude(),
      ],
    });
  } catch (error) {
    console.error("Error fetching FeeInvoice details:", error);
    throw error;
  }
}

export async function getStudentIdByClassStudentMapper(classStudentMapperId, options = {}) {
  try {
    return assertScopedClassStudentMapper(classStudentMapperId, options.transaction);
  } catch (error) {
    console.error("Error fetching Student Id By ClassStudentMapper details:", error);
    throw error;
  }
}

export async function updateFeeInvoice(feeInvoiceId, feeInvoiceData, transaction) {
  try {
    const existing = await assertScopedFeeInvoice(feeInvoiceId, transaction);
    if (!existing) {
      return [0];
    }

    return model.feeInvoiceModel.unscoped().update(feeInvoiceData, {
      where: { feeInvoiceId },
      transaction,
    });
  } catch (error) {
    console.error(`Error updating FeeInvoice creation ${feeInvoiceId}:`, error);
    throw error;
  }
}

export async function deleteFeeInvoice(feeInvoiceId) {
  const existing = await assertScopedFeeInvoice(feeInvoiceId);
  if (!existing) {
    return false;
  }

  const deleted = await model.feeInvoiceModel.unscoped().destroy({ where: { feeInvoiceId } });
  return deleted > 0;
}

export async function findInstituteCodeForScope(options = {}) {
  const store = requestContext.getStore();
  if (!store?.instituteId) {
    throw new Error("Institute scope required");
  }

  return scoped(model.instituteModel).findOne({
    attributes: ["institute_code"],
    where: { instituteId: store.instituteId },
    transaction: options.transaction,
  });
}

export async function latestInoviceNumber(instituteCode) {
  try {
    return model.studentInvoiceMapperModel.unscoped().findOne({
      attributes: ["invoice_number"],
      where: {
        invoice_number: {
          [Op.regexp]: `^${instituteCode}(-|$)`,
        },
        ...buildScope(model.studentInvoiceMapperModel),
      },
      order: [["invoice_number", "DESC"]],
    });
  } catch (error) {
    console.error(`Error in latest Inovice Number for institue Code ${instituteCode}:`, error);
    throw error;
  }
}

export async function latestInvoiceDetailNumber(instituteCode) {
  try {
    return model.feeInvoiceDetailModel.unscoped().findOne({
      attributes: ["invoice_detail_number"],
      where: {
        invoice_detail_number: {
          [Op.regexp]: `^${instituteCode}(-|$)`,
        },
      },
      include: [
        {
          model: model.feeInvoiceModel.unscoped(),
          as: "feeInvoiceDetails",
          attributes: [],
          required: true,
          include: [userFeeInvoiceInclude()],
        },
      ],
      order: [["invoice_detail_number", "DESC"]],
    });
  } catch (error) {
    console.error(`Error in getting Invoice Detail Number for institue Code ${instituteCode}:`, error);
    throw error;
  }
}

export async function getFeeDetailsByStudentId(studentId, options = {}) {
  try {
    const student = await scoped(model.studentModel).findOne({
      attributes: ["studentId"],
      where: { studentId },
      transaction: options.transaction,
    });
    if (!student) {
      return [];
    }

    return model.studentInvoiceMapperModel.unscoped().findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: { studentId, ...buildScope(model.studentInvoiceMapperModel) },
      include: [
        {
          model: model.feeTypeGroupModel.unscoped(),
          as: "feeTypeGroup",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          include: [
            {
              model: model.feeTypeModel.unscoped(),
              as: "feeTypes",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              include: [
                {
                  model: model.feeGroupModel.unscoped(),
                  as: "feeGroup",
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                  where: buildScope(model.feeGroupModel),
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: model.feeNewInvoiceModel.unscoped(),
          as: "feeInvoicedata",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          include: [
            {
              model: model.feePlanModel.unscoped(),
              as: "feePlan",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              where: buildScope(model.feePlanModel),
              required: false,
            },
            {
              model: model.feePlanTypeModel.unscoped(),
              as: "additionalFees",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            },
            {
              model: model.feePlanSemesterModel.unscoped(),
              as: "semesters",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            },
          ],
        },
        {
          model: model.feeInvoiceDetailRecordModel.unscoped(),
          as: "studentMakePayment",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        },
        {
          model: model.studentModel.unscoped(),
          as: "studentinvoice",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.studentModel),
          required: true,
          include: [
            {
              model: model.acedmicYearModel.unscoped(),
              as: "acdemicYear",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
            {
              model: model.affiliatedIniversityModel.unscoped(),
              as: "affiliatedUniversity",
              attributes: {
                exclude: [
                  "createdAt",
                  "updatedAt",
                  "deletedAt",
                  "universityId",
                  "affiliatedUniversityId",
                  "instituteId",
                  "affiliatedUniversityCode",
                ],
              },
            },
            {
              model: model.courseModel.unscoped(),
              as: "course",
              attributes: {
                exclude: [
                  "createdAt",
                  "updatedAt",
                  "deletedAt",
                  "universityId",
                  "courseId",
                  "course_levelId",
                  "courseCode",
                ],
              },
            },
            {
              model: model.semesterModel.unscoped(),
              as: "studentSemester",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
              include: [
                {
                  model: model.classSectionModel.unscoped(),
                  as: "classSections",
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                },
              ],
            },
            {
              model: model.sessionModel.unscoped(),
              as: "studentSession",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
            {
              model: model.specializationModel.unscoped(),
              as: "specialization",
              attributes: {
                exclude: [
                  "createdAt",
                  "updatedAt",
                  "deletedAt",
                  "universityId",
                  "specializationId",
                  "course_Id",
                  "specializationCode",
                ],
              },
            },
          ],
        },
      ],
      transaction: options.transaction,
    });
  } catch (error) {
    console.error("Error fetching student FeeInvoice details:", error);
    throw error;
  }
}
