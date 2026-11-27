import sequelize from "../database/sequelizeConfig.js";
import * as feeTypeCategoryRepo from "../repository/feeTypeCategoryRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

function categoryUpdatePayload(body) {
  const { feeTypeCategoryId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function addFeeTypeCategory(body) {
  return withAuditEvent(AUDIT_EVENTS.FEE_TYPE_CATEGORY_CREATE, async ({ transaction }) => {
    const { name, description } = body;
    const created = await feeTypeCategoryRepo.createFeeTypeCategory(
      {
        name,
        description: description ?? null,
      },
      { transaction }
    );
    return created.get({ plain: true });
  });
}

export async function listFeeTypeCategories() {
  return sequelize.transaction(async (transaction) =>
    feeTypeCategoryRepo.findFeeTypeCategories({ transaction })
  );
}

export async function getSingleFeeTypeCategory(feeTypeCategoryId) {
  return sequelize.transaction(async (transaction) =>
    feeTypeCategoryRepo.findFeeTypeCategoryById(feeTypeCategoryId, { transaction })
  );
}

export async function updateFeeTypeCategory(feeTypeCategoryId, body) {
  return withAuditEvent(AUDIT_EVENTS.FEE_TYPE_CATEGORY_UPDATE, async ({ transaction }) => {
    const payload = categoryUpdatePayload(body);
    const affected = await feeTypeCategoryRepo.updateFeeTypeCategory(feeTypeCategoryId, payload, {
      transaction,
    });
    if (!affected) {
      throw new Error("Fee type category not found or not in your university");
    }
    return feeTypeCategoryRepo.findFeeTypeCategoryById(feeTypeCategoryId, { transaction });
  });
}

export async function deleteFeeTypeCategory(feeTypeCategoryId) {
  return withAuditEvent(AUDIT_EVENTS.FEE_TYPE_CATEGORY_DELETE, async ({ transaction }) => {
    const inUse = await feeTypeCategoryRepo.countCatalogRowsForCategory(feeTypeCategoryId, {
      transaction,
    });
    if (inUse > 0) {
      throw new Error(
        `Cannot delete: ${inUse} fee type catalog row(s) still reference this category`
      );
    }
    const ok = await feeTypeCategoryRepo.deleteFeeTypeCategory(feeTypeCategoryId, { transaction });
    if (!ok) {
      throw new Error("Fee type category not found or not in your university");
    }
    return true;
  });
}
