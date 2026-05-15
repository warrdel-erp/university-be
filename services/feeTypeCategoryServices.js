import sequelize from "../database/sequelizeConfig.js";
import * as feeTypeCategoryRepo from "../repository/feeTypeCategoryRepository.js";

function categoryUpdatePayload(body) {
  const { feeTypeCategoryId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function addFeeTypeCategory(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const { name, description } = body;
    const created = await feeTypeCategoryRepo.createFeeTypeCategory(
      {
        name,
        description: description ?? null,
        instituteId,
      },
      { transaction }
    );
    return created.get({ plain: true });
  });

  return row;
}

export async function listFeeTypeCategories(instituteId) {
  const rows = await sequelize.transaction(async (transaction) => {
    const list = await feeTypeCategoryRepo.findFeeTypeCategoriesByInstitute(instituteId, {
      transaction,
    });
    return list;
  });

  return rows;
}

export async function getSingleFeeTypeCategory(feeTypeCategoryId, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const found = await feeTypeCategoryRepo.findFeeTypeCategoryById(feeTypeCategoryId, instituteId, {
      transaction,
    });
    return found;
  });

  return row;
}

export async function updateFeeTypeCategory(feeTypeCategoryId, body, instituteId) {
  const updated = await sequelize.transaction(async (transaction) => {
    const payload = categoryUpdatePayload(body);
    const affected = await feeTypeCategoryRepo.updateFeeTypeCategory(
      feeTypeCategoryId,
      instituteId,
      payload,
      { transaction }
    );
    if (!affected) {
      throw new Error("Fee type category not found or not in your institute");
    }
    const fresh = await feeTypeCategoryRepo.findFeeTypeCategoryById(feeTypeCategoryId, instituteId, {
      transaction,
    });
    return fresh;
  });

  return updated;
}

export async function deleteFeeTypeCategory(feeTypeCategoryId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const inUse = await feeTypeCategoryRepo.countCatalogRowsForCategory(feeTypeCategoryId, {
      transaction,
    });
    if (inUse > 0) {
      throw new Error(
        `Cannot delete: ${inUse} fee type catalog row(s) still reference this category`
      );
    }
    const ok = await feeTypeCategoryRepo.deleteFeeTypeCategory(feeTypeCategoryId, instituteId, {
      transaction,
    });
    if (!ok) {
      throw new Error("Fee type category not found or not in your institute");
    }
  });

  return true;
}
