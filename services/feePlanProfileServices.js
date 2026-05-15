import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/feePlanProfileRepository.js";
import * as catalogRepo from "../repository/feeTypeCatalogRepository.js";
import { decimalAdd, decimalSum, toMoneyNumber } from "../utility/decimalMoney.js";

/** Creates installments + catalogs + additional fees for an existing profile (used by POST and PATCH). */
async function createInstallmentsFromBody(feePlanItemsInput, feePlanProfileId, instituteId, transaction) {
  const feePlanItems = [];
  for (const installment of feePlanItemsInput) {
    const dueDate =
      installment.dueDate && String(installment.dueDate).trim() !== ""
        ? installment.dueDate
        : null;

    const feePlanItem = await repo.createFeePlanItem(
      {
        createDate: installment.startDate,
        dueDate,
        termName: installment.name,
        amount: installment.amount,
        feePlanProfileId,
        instituteId,
      },
      { transaction }
    );

    const additionalFees = [];
    for (const catalogLine of installment.feeTypeCatalogs ?? []) {
      const category = await catalogRepo.findFeeTypeCategoryByIdForInstitute(
        catalogLine.feeTypeCategoryId,
        instituteId,
        { transaction }
      );
      if (!category) {
        throw new Error(
          `feeTypeCategoryId ${catalogLine.feeTypeCategoryId} not found for this institute`
        );
      }

      const feeTypeCatalog = await catalogRepo.createFeeTypeCatalog(
        {
          name: catalogLine.name.trim(),
          description: null,
          amount: catalogLine.amount,
          feeTypeCategoryId: catalogLine.feeTypeCategoryId,
          instituteId,
        },
        { transaction }
      );

      const additionalFee = await repo.createAdditionalFee(
        {
          amount: catalogLine.amount,
          feeTypeCatalogId: feeTypeCatalog.feeTypeCatalogId,
          feePlanItemId: feePlanItem.feePlanItemId,
          instituteId,
        },
        { transaction }
      );

      additionalFees.push({
        additionalFeeId: additionalFee.additionalFeeId,
        feeTypeCatalogId: feeTypeCatalog.feeTypeCatalogId,
        feeTypeCategoryId: catalogLine.feeTypeCategoryId,
        name: catalogLine.name.trim(),
        amount: String(catalogLine.amount),
      });
    }

    feePlanItems.push({
      feePlanItemId: feePlanItem.feePlanItemId,
      name: installment.name,
      startDate: installment.startDate,
      dueDate,
      amount: String(installment.amount),
      additionalFees,
    });
  }
  return feePlanItems;
}

async function createFeePlanProfileWithNestedItems(body, instituteId) {
  const mapId = body.courseSessionId;

  const result = await sequelize.transaction(async (transaction) => {
    await repo.assertCourseSessionForInstitute(mapId, instituteId, body.academicYearId, {
      transaction,
    });

    const profile = await repo.createFeePlanProfile(
      {
        name: body.name,
        planType: body.planType,
        courseSessionId: mapId,
        instituteId,
      },
      { transaction }
    );
    await profile.reload({ transaction });

    const feePlanProfileId = profile.feePlanProfileId;
    const feePlanItems = await createInstallmentsFromBody(
      body.feePlanItems,
      feePlanProfileId,
      instituteId,
      transaction
    );

    return {
      feePlanProfileId,
      feePlanProfile: profile.get({ plain: true }),
      feePlanItems,
    };
  });

  return result;
}

export async function addFeePlanProfile(body, instituteId) {
  if (body.feePlanItems.length > 0) {
    const created = await createFeePlanProfileWithNestedItems(body, instituteId);
    return created;
  }

  const mapId = body.courseSessionId;
  const profile = await sequelize.transaction(async (transaction) => {
    await repo.assertCourseSessionForInstitute(mapId, instituteId, body.academicYearId, {
      transaction,
    });
    const row = await repo.createFeePlanProfile(
      {
        name: body.name,
        planType: body.planType,
        courseSessionId: mapId,
        instituteId,
      },
      { transaction }
    );
    return row;
  });

  return profile;
}

export async function listFeePlanProfiles(instituteId, courseSessionId) {
  const payload = await sequelize.transaction(async (transaction) => {
    const mapping = await repo.findSessionCourseMappingForInstitute(
      courseSessionId,
      instituteId,
      { transaction }
    );
    if (!mapping) {
      const err = new Error("courseSessionId not found or not in your institute");
      err.statusCode = 400;
      throw err;
    }

    const list = await repo.findFeePlanProfilesByInstitute(instituteId, {
      courseSessionId,
      transaction,
    });

    const feePlans = [];
    for (const row of list) {
      const p = row.get({ plain: true });
      const items = p.feePlanItems ?? [];
      const termFees = decimalSum(items.map((item) => toMoneyNumber(item.amount)));
      let additionalFeesTotal = 0;
      for (const item of items) {
        for (const af of item.itemAdditionalFees ?? []) {
          additionalFeesTotal = decimalAdd(additionalFeesTotal, toMoneyNumber(af.amount));
        }
      }
      const totalInvoices = await repo.countStudentFeeInvoicesForFeePlanProfile(
        p.feePlanProfileId,
        instituteId,
        { transaction }
      );

      feePlans.push({
        feePlanProfileId: p.feePlanProfileId,
        planName: p.name,
        planType: p.planType,
        term: items.length,
        termFees,
        additionalFees: additionalFeesTotal,
        totalFees: decimalAdd(termFees, additionalFeesTotal),
        totalInvoices,
        instituteId: p.instituteId,
      });
    }

    return { courseSessionId, feePlans };
  });

  return payload;
}

export async function getSingleFeePlanProfile(feePlanProfileId, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const found = await repo.findFeePlanProfileById(feePlanProfileId, instituteId, { transaction });
    return found;
  });

  return row;
}

export async function updateFeePlanProfile(body, instituteId) {
  const { feePlanProfileId, name, planType, courseSessionId, academicYearId, feePlanItems } = body;

  const result = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findFeePlanProfileById(feePlanProfileId, instituteId, {
      transaction,
    });
    if (!existing) {
      throw new Error("Fee plan profile not found or not in your institute");
    }

    const profilePatch = {};
    if (name !== undefined) profilePatch.name = name;
    if (planType !== undefined) profilePatch.planType = planType;
    if (courseSessionId !== undefined) profilePatch.courseSessionId = courseSessionId;

    const mapId = courseSessionId ?? existing.get("courseSessionId");

    if (courseSessionId != null) {
      const mapping = await repo.findSessionCourseMappingForInstitute(courseSessionId, instituteId, {
        transaction,
      });
      if (!mapping) {
        throw new Error("courseSessionId not found or not in your institute");
      }
    }

    if (academicYearId != null || Object.keys(profilePatch).length > 0) {
      await repo.assertCourseSessionForInstitute(mapId, instituteId, academicYearId, {
        transaction,
      });
    }

    if (Object.keys(profilePatch).length > 0) {
      await repo.updateFeePlanProfile(feePlanProfileId, instituteId, profilePatch, { transaction });
    }

    if (feePlanItems.length > 0) {
      const invoiceCount = await repo.countStudentFeeInvoicesForFeePlanProfile(
        feePlanProfileId,
        instituteId,
        { transaction }
      );
      if (invoiceCount > 0) {
        throw new Error(
          "Cannot replace feePlanItems while student fee invoices exist for this fee plan profile"
        );
      }
      await repo.removeInstallmentsAndCatalogsForProfile(feePlanProfileId, instituteId, { transaction });
      const createdItems = await createInstallmentsFromBody(
        feePlanItems,
        feePlanProfileId,
        instituteId,
        transaction
      );
      const profile = await repo.findFeePlanProfileById(feePlanProfileId, instituteId, { transaction });
      return {
        feePlanProfileId,
        feePlanProfile: profile.get({ plain: true }),
        feePlanItems: createdItems,
      };
    }

    const fresh = await repo.findFeePlanProfileById(feePlanProfileId, instituteId, { transaction });
    return fresh;
  });

  return result;
}

export async function deleteFeePlanProfile(feePlanProfileId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const inUse = await repo.countAdditionalFeesForProfile(feePlanProfileId, { transaction });
    if (inUse > 0) {
      throw new Error(`Cannot delete: ${inUse} additional fee row(s) reference this fee plan profile`);
    }
    const ok = await repo.deleteFeePlanProfile(feePlanProfileId, instituteId, { transaction });
    if (!ok) {
      throw new Error("Fee plan profile not found or not in your institute");
    }
  });

  return true;
}
