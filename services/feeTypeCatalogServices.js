import sequelize from "../database/sequelizeConfig.js";
import * as feeTypeCatalogRepo from "../repository/feeTypeCatalogRepository.js";

function catalogUpdatePayload(body) {
  const { feeTypeCatalogId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function addFeeTypeCatalog(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const { name, amount, feeTypeCategoryId, description } = body;

    const category = await feeTypeCatalogRepo.findFeeTypeCategoryByIdForInstitute(
      feeTypeCategoryId,
      instituteId,
      { transaction }
    );
    if (!category) {
      throw new Error("feeTypeCategoryId not found or not in your institute");
    }

    const created = await feeTypeCatalogRepo.createFeeTypeCatalog(
      {
        name,
        amount,
        feeTypeCategoryId,
        instituteId,
        description: description ?? null,
      },
      { transaction }
    );

    return created.get({ plain: true });
  });

  return row;
}

export async function listFeeTypeCatalogs(instituteId) {
  const rows = await sequelize.transaction(async (transaction) => {
    const list = await feeTypeCatalogRepo.findFeeTypeCatalogsByInstitute(instituteId, {
      transaction,
    });
    return list;
  });

  return rows;
}

export async function getSingleFeeTypeCatalog(feeTypeCatalogId, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const found = await feeTypeCatalogRepo.findFeeTypeCatalogById(feeTypeCatalogId, instituteId, {
      transaction,
    });
    return found;
  });

  return row;
}

export async function updateFeeTypeCatalog(feeTypeCatalogId, body, instituteId) {
  const updated = await sequelize.transaction(async (transaction) => {
    const existing = await feeTypeCatalogRepo.findFeeTypeCatalogById(feeTypeCatalogId, instituteId, {
      transaction,
    });
    if (!existing) {
      throw new Error("Fee type catalog not found or not in your institute");
    }

    const payload = catalogUpdatePayload(body);

    if (payload.feeTypeCategoryId !== undefined) {
      const cat = await feeTypeCatalogRepo.findFeeTypeCategoryByIdForInstitute(
        payload.feeTypeCategoryId,
        instituteId,
        { transaction }
      );
      if (!cat) {
        throw new Error("feeTypeCategoryId not found or not in your institute");
      }
    }

    const affected = await feeTypeCatalogRepo.updateFeeTypeCatalog(
      feeTypeCatalogId,
      instituteId,
      payload,
      { transaction }
    );
    if (!affected) {
      throw new Error("Update failed");
    }
    const fresh = await feeTypeCatalogRepo.findFeeTypeCatalogById(feeTypeCatalogId, instituteId, {
      transaction,
    });
    return fresh;
  });

  return updated;
}

export async function deleteFeeTypeCatalog(feeTypeCatalogId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const existing = await feeTypeCatalogRepo.findFeeTypeCatalogById(feeTypeCatalogId, instituteId, {
      transaction,
    });
    if (!existing) {
      throw new Error("Fee type catalog not found or not in your institute");
    }

    const [planLineCount, invoiceLineCount] = await Promise.all([
      feeTypeCatalogRepo.countPlanSubItemsForCatalog(feeTypeCatalogId, { transaction }),
      feeTypeCatalogRepo.countInvoiceItemsForCatalog(feeTypeCatalogId, { transaction }),
    ]);
    if (planLineCount > 0 || invoiceLineCount > 0) {
      const parts = [];
      if (planLineCount > 0) parts.push(`${planLineCount} fee plan line(s)`);
      if (invoiceLineCount > 0) parts.push(`${invoiceLineCount} invoice line(s)`);
      throw new Error(`Cannot delete: catalog is referenced by ${parts.join(" and ")}`);
    }

    await feeTypeCatalogRepo.deleteFeeTypeCatalog(feeTypeCatalogId, instituteId, {
      transaction,
    });
  });

  return true;
}
