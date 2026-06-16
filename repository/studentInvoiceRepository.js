import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function feePlanStudentInclude() {
  return {
    model: model.feePlanModel.unscoped(),
    as: "studentFeePlan",
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "description"],
    },
    where: buildScope(model.feePlanModel),
    required: false,
    include: [
      {
        model: model.feeNewInvoiceModel.unscoped(),
        as: "invoices",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        include: [
          {
            model: model.feePlanSemesterModel.unscoped(),
            as: "semesters",
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          },
          {
            model: model.feePlanTypeModel.unscoped(),
            as: "additionalFees",
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          },
        ],
      },
      {
        model: model.sessionModel.unscoped(),
        as: "sessionFee",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "acedmic_year_id"] },
      },
      {
        model: model.courseModel.unscoped(),
        as: "courseFee",
        attributes: {
          exclude: [
            "createdAt",
            "updatedAt",
            "deletedAt",
            "createdBy",
            "updatedBy",
            "affiliated_university_id",
            "institute_id",
            "acedmic_year_id",
          ],
        },
      },
      {
        model: model.acedmicYearModel.unscoped(),
        as: "acedmicYearFee",
        attributes: {
          exclude: [
            "createdAt",
            "updatedAt",
            "deletedAt",
            "createdBy",
            "updatedBy",
            "affiliated_university_id",
            "institute_id",
          ],
        },
      },
    ],
  };
}

function studentListIncludes() {
  return [
    feePlanStudentInclude(),
    {
      model: model.classSectionModel.unscoped(),
      as: "studentSections",
      attributes: {
        exclude: [
          "createdAt",
          "updatedAt",
          "deletedAt",
          "createdBy",
          "updatedBy",
          "affiliated_university_id",
          "institute_id",
          "course_id",
          "semester_id",
          "class_id",
          "acedmic_year_id",
          "specialization_id",
          "session_id",
        ],
      },
    },
  ];
}

export async function getStudentCount(type) {
  try {
    if (!type || type === "total") {
      const [activeCount, inactiveCount] = await Promise.all([
        scoped(model.studentModel).count({ where: { feeStatus: true } }),
        scoped(model.studentModel).count({ where: { feeStatus: false } }),
      ]);
      return {
        active: activeCount,
        inactive: inactiveCount,
        all: activeCount + inactiveCount,
      };
    }

    const whereClause = {};
    if (type === "active") {
      whereClause.feeStatus = true;
    } else if (type === "inactive") {
      whereClause.feeStatus = false;
    }

    return scoped(model.studentModel).findAll({
      attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "admisssionDate"],
      where: whereClause,
      include: studentListIncludes(),
    });
  } catch (error) {
    console.error("Error in getStudentCount:", error);
    throw error;
  }
}

export async function getAllActiveInvoice() {
  try {
    return model.studentInvoiceMapperModel.unscoped().findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: buildScope(model.studentInvoiceMapperModel),
      include: [
        {
          model: model.studentModel.unscoped(),
          as: "studentinvoice",
          attributes: ["scholarNumber", "firstName", "middleName", "lastName", "admisssionDate", "enrollDate"],
          where: buildScope(model.studentModel),
          required: true,
        },
        {
          model: model.feeNewInvoiceModel.unscoped(),
          as: "feeInvoicedata",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          include: [
            {
              model: model.feePlanSemesterModel.unscoped(),
              as: "semesters",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            },
            {
              model: model.feePlanTypeModel.unscoped(),
              as: "additionalFees",
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
      ],
    });
  } catch (error) {
    console.error("Error fetching all active fee plan:", error);
    throw error;
  }
}

async function assertScopedStudentInvoiceMapper(studentInvoiceMapperId, transaction) {
  return model.studentInvoiceMapperModel.unscoped().findOne({
    attributes: ["studentInvoiceMapperId"],
    where: { studentInvoiceMapperId },
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

export async function updateFeeNewInvoice(feeNewInvoiceId, data, options = {}) {
  try {
    const mapper = await model.studentInvoiceMapperModel.unscoped().findOne({
      attributes: ["studentInvoiceMapperId"],
      where: { feeNewInvoiceId },
      include: [
        {
          model: model.studentModel.unscoped(),
          as: "studentinvoice",
          attributes: [],
          where: buildScope(model.studentModel),
          required: true,
        },
      ],
      transaction: options.transaction,
    });
    if (!mapper) {
      return [0];
    }

    return model.studentInvoiceMapperModel.unscoped().update(data, {
      where: { feeNewInvoiceId },
      transaction: options.transaction,
    });
  } catch (error) {
    console.error(`Error updating studentInvoiceMapperModel  ${feeNewInvoiceId}:`, error);
    throw error;
  }
}

export async function addStudentSpecificInvoice(data, transaction = null) {
  try {
    const student = await scoped(model.studentModel).findOne({
      attributes: ["studentId"],
      where: { studentId: data.studentId },
      transaction,
    });
    if (!student) {
      throw new Error("Student not found");
    }

    return scoped(model.studentInvoiceMapperModel).create(data, { transaction });
  } catch (error) {
    console.error("Error in add Student specific Invoice:", error);
    throw error;
  }
}

export async function addMultipleFeeTypeGroup(dataArray, transaction = null) {
  try {
    for (const row of dataArray) {
      const mapper = await assertScopedStudentInvoiceMapper(row.studentInvoiceMapperId, transaction);
      if (!mapper) {
        throw new Error("Student invoice mapper not found");
      }
    }

    return model.feeTypeGroupModel.unscoped().bulkCreate(dataArray, { transaction });
  } catch (error) {
    console.error("Error in bulk insert fee type group:", error);
    throw error;
  }
}
