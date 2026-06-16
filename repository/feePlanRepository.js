import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

function feePlanExcludedAttributes() {
  return ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];
}

function feePlanDetailIncludes() {
  const excludeAttrs = feePlanExcludedAttributes();

  return [
    {
      model: model.sessionModel.unscoped(),
      as: "sessionFee",
      attributes: { exclude: [...excludeAttrs, "acedmic_year_id"] },
    },
    {
      model: model.courseModel.unscoped(),
      as: "courseFee",
      attributes: {
        exclude: [...excludeAttrs, "affiliated_university_id", "institute_id", "acedmic_year_id"],
      },
    },
    {
      model: model.acedmicYearModel.unscoped(),
      as: "acedmicYearFee",
      attributes: { exclude: [...excludeAttrs, "affiliated_university_id", "institute_id"] },
    },
    {
      model: model.feeNewInvoiceModel.unscoped(),
      as: "invoices",
      attributes: { exclude: excludeAttrs },
      include: [
        {
          model: model.feePlanSemesterModel.unscoped(),
          as: "semesters",
          attributes: { exclude: excludeAttrs },
        },
        {
          model: model.feePlanTypeModel.unscoped(),
          as: "additionalFees",
          attributes: { exclude: excludeAttrs },
        },
      ],
    },
  ];
}

function feePlanInvoiceIncludes() {
  const excludeAttrs = feePlanExcludedAttributes();

  return [
    {
      model: model.feeNewInvoiceModel.unscoped(),
      as: "invoices",
      attributes: { exclude: excludeAttrs },
      include: [
        {
          model: model.feePlanSemesterModel.unscoped(),
          as: "semesters",
          attributes: { exclude: excludeAttrs },
        },
        {
          model: model.feePlanTypeModel.unscoped(),
          as: "additionalFees",
          attributes: { exclude: excludeAttrs },
        },
      ],
    },
  ];
}

export async function addFeePlan(data, transaction) {
  try {
    return scoped(model.feePlanModel).create(data, { transaction });
  } catch (error) {
    console.error("Error in add Fee Plan :", error);
    throw error;
  }
}

export async function addFeeNewInvoice(data, transaction) {
  try {
    return model.feeNewInvoiceModel.unscoped().create(data, { transaction });
  } catch (error) {
    console.error("Error in add Fee New Invoice :", error);
    throw error;
  }
}

export async function addFeePlanSemester(data, transaction) {
  try {
    return model.feePlanSemesterModel.unscoped().create(data, { transaction });
  } catch (error) {
    console.error("Error in add Fee Plan Semester :", error);
    throw error;
  }
}

export async function addFeePlanType(data, transaction) {
  try {
    return model.feePlanTypeModel.unscoped().create(data, { transaction });
  } catch (error) {
    console.error("Error in add Fee Plan Type :", error);
    throw error;
  }
}

export async function getFeePlanDetails(filters = {}) {
  try {
    const businessWhere = filters.acedmicYearId ? { acedmicYearId: filters.acedmicYearId } : {};

    return scoped(model.feePlanModel).findAll({
      attributes: { exclude: feePlanExcludedAttributes() },
      where: businessWhere,
      include: feePlanDetailIncludes(),
    });
  } catch (error) {
    console.error("Error fetching FeePlan details:", error);
    throw error;
  }
}

export async function getSingleFeePlanDetails(feePlanId) {
  try {
    return scoped(model.feePlanModel).findOne({
      attributes: { exclude: feePlanExcludedAttributes() },
      where: { feePlanId },
      include: feePlanInvoiceIncludes(),
    });
  } catch (error) {
    console.error("Error fetching Fee Plan details single:", error);
    throw error;
  }
}

export async function getfeePlanByCourseAndAcedmic(courseId, acedmicYearId) {
  try {
    return scoped(model.feePlanModel).findAll({
      attributes: { exclude: feePlanExcludedAttributes() },
      where: { courseId, acedmicYearId },
    });
  } catch (error) {
    console.error("Error fetching Fee Plan details by course and acedmic year:", error);
    throw error;
  }
}

export async function updateFeePlan(feePlanId, data) {
  try {
    const existing = await scoped(model.feePlanModel).findOne({
      attributes: ["feePlanId"],
      where: { feePlanId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.feePlanModel).update(data, {
      where: { feePlanId },
    });
  } catch (error) {
    console.error(`Error updating FeePlan ${feePlanId}:`, error);
    throw error;
  }
}

export async function deleteFeePlan(feePlanId) {
  const deleted = await scoped(model.feePlanModel).destroy({ where: { feePlanId } });
  return deleted > 0;
}

export async function findByPlanId(feePlanId, options = {}) {
  try {
    const plan = await scoped(model.feePlanModel).findOne({
      attributes: ["feePlanId"],
      where: { feePlanId },
      transaction: options.transaction,
    });
    if (!plan) {
      return [];
    }

    return model.feeNewInvoiceModel.unscoped().findAll({
      attributes: { exclude: feePlanExcludedAttributes() },
      where: { feePlanId },
      transaction: options.transaction,
    });
  } catch (error) {
    console.error("Error in findByPlanId:", error);
    throw error;
  }
}
