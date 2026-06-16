import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function recordExcludedAttributes() {
  return ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];
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

async function assertScopedStudentInvoiceMapper(studentInvoiceMapperId, transaction) {
  return model.studentInvoiceMapperModel.unscoped().findOne({
    attributes: ["studentInvoiceMapperId"],
    where: { studentInvoiceMapperId, ...buildScope(model.studentInvoiceMapperModel) },
    include: [
      {
        model: model.studentModel.unscoped(),
        as: "studentinvoice",
        attributes: [],
        where: buildScope(model.studentModel),
        required: true,
      },
    ],
    transaction,
  });
}

export async function addFeeInvoiceDetailRecord(feeInvoiceArray, options = {}) {
  try {
    const transaction = options.transaction;

    for (const record of feeInvoiceArray) {
      const mapper = await assertScopedStudentInvoiceMapper(record.studentInvoiceMapperId, transaction);
      if (!mapper) {
        throw new Error("Student invoice mapper not found");
      }
    }

    return scoped(model.feeInvoiceDetailRecordModel).bulkCreate(feeInvoiceArray, {
      returning: true,
      transaction,
    });
  } catch (error) {
    console.error("Error in add Fee Invoice Record :", error);
    throw error;
  }
}

export async function getAllFeeInvoiceDetailRecord() {
  try {
    return model.feeInvoiceDetailRecordModel.unscoped().findAll({
      attributes: { exclude: recordExcludedAttributes() },
      include: [
        {
          model: model.studentInvoiceMapperModel.unscoped(),
          as: "studentMakePayment",
          required: true,
          where: buildScope(model.studentInvoiceMapperModel),
          include: [
            {
              model: model.studentModel.unscoped(),
              as: "studentinvoice",
              attributes: ["firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
              where: buildScope(model.studentModel),
              required: true,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching Fee Invoice details Record:", error);
    throw error;
  }
}

export async function getSingleFeeInvoiceDetails(feeInvoiceId) {
  try {
    return model.feeInvoiceModel.unscoped().findOne({
      attributes: { exclude: [...recordExcludedAttributes(), "fee_type_id"] },
      where: { feeInvoiceId },
      include: [
        userFeeInvoiceInclude(),
        {
          model: model.feePlanModel.unscoped(),
          as: "feeInvoicePlan",
          attributes: { exclude: [...recordExcludedAttributes(), "fee_group_id"] },
          where: buildScope(model.feePlanModel),
          required: false,
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
        {
          model: model.feeInvoiceDetailModel.unscoped(),
          as: "feeInvoiceDetails",
          attributes: [
            "feeInvoiceDetailsId",
            "feeInvoiceId",
            "feeTypeId",
            "amount",
            "waiver",
            "subTotal",
            "paidAmount",
          ],
          include: [
            {
              model: model.feePlanTypeModel.unscoped(),
              as: "feeInvoiceTypePlan",
              attributes: { exclude: recordExcludedAttributes() },
            },
            {
              model: model.feePlanSemesterModel.unscoped(),
              as: "feeInvoiceTypeSemester",
              attributes: { exclude: recordExcludedAttributes() },
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching FeeInvoice details:", error);
    throw error;
  }
}
