import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function recordExcludedAttributes() {
  return ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];
}

function userFeeInvoiceInclude() {
  return {
    model: model.userModel,
    as: "userFeeInvoice",
    attributes: ["universityId", "userId"],
    where: buildScope(model.userModel),
    required: true,
  };
}

async function assertScopedStudentInvoiceMapper(studentInvoiceMapperId, transaction) {
  return scoped(model.studentInvoiceMapperModel).findOne({
    attributes: ["studentInvoiceMapperId"],
    where: { studentInvoiceMapperId, ...buildScope(model.studentInvoiceMapperModel) },
    include: [
      {
        model: model.studentModel,
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
    return scoped(model.feeInvoiceDetailRecordModel).findAll({
      attributes: { exclude: recordExcludedAttributes() },
      include: [
        {
          model: model.studentInvoiceMapperModel,
          as: "studentMakePayment",
          required: true,
          where: buildScope(model.studentInvoiceMapperModel),
          include: [
            {
              model: model.studentModel,
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
    return scoped(model.feeInvoiceModel).findOne({
      attributes: { exclude: [...recordExcludedAttributes(), "fee_type_id"] },
      where: { feeInvoiceId },
      include: [
        userFeeInvoiceInclude(),
        {
          model: model.feePlanModel,
          as: "feeInvoicePlan",
          attributes: { exclude: [...recordExcludedAttributes(), "fee_group_id"] },
          where: buildScope(model.feePlanModel),
          required: false,
        },
        {
          model: model.classStudentMapperModel,
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
              model: model.studentModel,
              as: "studentMapped",
              attributes: ["firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
              where: buildScope(model.studentModel),
              required: true,
            },
            {
              model: model.classSectionModel,
              as: "studentSectionDetail",
              attributes: ["section", "classSectionsId", "year"],
            },
          ],
        },
        {
          model: model.feeInvoiceDetailModel,
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
              model: model.feePlanTypeModel,
              as: "feeInvoiceTypePlan",
              attributes: { exclude: recordExcludedAttributes() },
            },
            {
              model: model.feePlanSemesterModel,
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
