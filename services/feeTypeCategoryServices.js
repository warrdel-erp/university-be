import sequelize from "../database/sequelizeConfig.js";
import * as feeTypeCategoryRepo from "../repository/feeTypeCategoryRepository.js";

function categoryUpdatePayload(body) {
  const { feeTypeCategoryId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function addFeeTypeCategory(body) {
  const row = await sequelize.transaction(async (transaction) => {
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

  return row;
}

export async function listFeeTypeCategories() {
  return sequelize.transaction(async (transaction) =>
    feeTypeCategoryRepo.findFeeTypeCategoriesByInstitute({ transaction })
  );
}

export async function getSingleFeeTypeCategory(feeTypeCategoryId) {
  return sequelize.transaction(async (transaction) =>
    feeTypeCategoryRepo.findFeeTypeCategoryById(feeTypeCategoryId, { transaction })
  );
}

export async function updateFeeTypeCategory(feeTypeCategoryId, body) {
  return sequelize.transaction(async (transaction) => {
    const payload = categoryUpdatePayload(body);
    const affected = await feeTypeCategoryRepo.updateFeeTypeCategory(feeTypeCategoryId, payload, {
      transaction,
    });
    if (!affected) {
      throw new Error("Fee type category not found or not in your institute");
    }
    return feeTypeCategoryRepo.findFeeTypeCategoryById(feeTypeCategoryId, { transaction });
  });
}

export async function deleteFeeTypeCategory(feeTypeCategoryId) {
  await sequelize.transaction(async (transaction) => {
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
      throw new Error("Fee type category not found or not in your institute");
    }
  });

  return true;
}
