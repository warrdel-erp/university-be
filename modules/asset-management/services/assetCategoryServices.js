import sequelize from "../../../database/sequelizeConfig.js";
import * as repo from "../repository/assetCategoryRepository.js";
import { deriveCategoryCodePrefixFromName } from "../../../utility/assetCode.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function updatePayload(body) {
  const { assetCategoryId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function addAssetCategory(body, options = {}) {
  const runner = async (transaction) => {
    const existing = await repo.findAssetCategoryByNameForInstitute(body.name, { transaction });
    if (existing) {
      throw httpError("Asset category name already exists in your institute", 409);
    }

    const created = await repo.createAssetCategory(
      {
        name: body.name,
        codePrefix: deriveCategoryCodePrefixFromName(body.name),
      },
      { transaction }
    );
    return created.get({ plain: true });
  };

  if (options?.transaction) {
    return runner(options.transaction);
  }
  return withAuditEvent(AUDIT_EVENTS.ASSET_CATEGORY_CREATE, async ({ transaction }) => {
    return runner(transaction);
  });
}

export async function listAssetCategories() {
  return sequelize.transaction(async (transaction) =>
    repo.findAssetCategoriesByInstitute({ transaction })
  );
}

export async function getSingleAssetCategory(assetCategoryId) {
  return sequelize.transaction(async (transaction) =>
    repo.findAssetCategoryById(assetCategoryId, { transaction })
  );
}

export async function updateAssetCategory(assetCategoryId, body, options = {}) {
  const runner = async (transaction) => {
    const payload = updatePayload(body);
    const affected = await repo.updateAssetCategory(assetCategoryId, payload, { transaction });
    if (!affected) {
      throw httpError("Asset category not found or not in your institute", 404);
    }
    return repo.findAssetCategoryById(assetCategoryId, { transaction });
  };

  if (options?.transaction) {
    return runner(options.transaction);
  }
  return withAuditEvent(AUDIT_EVENTS.ASSET_CATEGORY_UPDATE, async ({ transaction }) => {
    return runner(transaction);
  });
}

export async function deleteAssetCategory(assetCategoryId, options = {}) {
  const runner = async (transaction) => {
    const inUse = await repo.countAssetsForCategory(assetCategoryId, { transaction });
    if (inUse > 0) {
      throw httpError(`Cannot delete: ${inUse} asset(s) still reference this category`, 409);
    }
    const ok = await repo.deleteAssetCategory(assetCategoryId, { transaction });
    if (!ok) {
      throw httpError("Asset category not found or not in your institute", 404);
    }
    return true;
  };

  if (options?.transaction) {
    return runner(options.transaction);
  }
  return withAuditEvent(AUDIT_EVENTS.ASSET_CATEGORY_DELETE, async ({ transaction }) => {
    return runner(transaction);
  });
}
