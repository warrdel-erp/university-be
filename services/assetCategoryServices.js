import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetCategoryRepository.js";
import { deriveCategoryCodePrefixFromName } from "../utility/assetCode.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function updatePayload(body) {
  const { assetCategoryId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function addAssetCategory(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetCategoryByNameForInstitute(body.name, instituteId, {
      transaction,
    });
    if (existing) {
      throw httpError("Asset category name already exists in your institute", 409);
    }

    const created = await repo.createAssetCategory(
      {
        name: body.name,
        codePrefix: deriveCategoryCodePrefixFromName(body.name),
        instituteId,
      },
      { transaction }
    );
    return created.get({ plain: true });
  });
  return row;
}

export async function listAssetCategories(instituteId) {
  return sequelize.transaction(async (transaction) =>
    repo.findAssetCategoriesByInstitute(instituteId, { transaction })
  );
}

export async function getSingleAssetCategory(assetCategoryId, instituteId) {
  return sequelize.transaction(async (transaction) =>
    repo.findAssetCategoryById(assetCategoryId, instituteId, { transaction })
  );
}

export async function updateAssetCategory(assetCategoryId, body, instituteId) {
  return sequelize.transaction(async (transaction) => {
    const payload = updatePayload(body);
    const affected = await repo.updateAssetCategory(assetCategoryId, instituteId, payload, {
      transaction,
    });
    if (!affected) {
      throw httpError("Asset category not found or not in your institute", 404);
    }
    return repo.findAssetCategoryById(assetCategoryId, instituteId, { transaction });
  });
}

export async function deleteAssetCategory(assetCategoryId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const inUse = await repo.countAssetsForCategory(assetCategoryId, instituteId, { transaction });
    if (inUse > 0) {
      throw httpError(`Cannot delete: ${inUse} asset(s) still reference this category`, 409);
    }
    const ok = await repo.deleteAssetCategory(assetCategoryId, instituteId, { transaction });
    if (!ok) {
      throw httpError("Asset category not found or not in your institute", 404);
    }
  });
  return true;
}
